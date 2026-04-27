import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
  mkdirSync,
  copyFileSync,
  chmodSync
} from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { HookInstanceStatus } from '../shared/ipc'
import { DECK_DIR } from './event-watcher'

const HOME = homedir()
const HOOK_HANDLER_DEST = join(DECK_DIR, 'hook-handler.sh')
const MARKER = 'deck/hook-handler'
const HOOK_EVENTS = ['Stop', 'Notification', 'StopFailure'] as const

// Embedded hook handler — avoids path resolution issues in packaged app
const HOOK_HANDLER_CONTENT = `#!/bin/bash
set -e

INPUT=$(cat)

# Try jq first (faster), fallback to Python3 (always available on macOS)
if command -v jq >/dev/null 2>&1; then
  CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
  EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // "unknown"')
else
  PARSED=$(printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("cwd", ""))
    print(d.get("hook_event_name", "unknown"))
except Exception:
    pass
' 2>/dev/null)
  CWD=$(echo "$PARSED" | sed -n 1p)
  EVENT=$(echo "$PARSED" | sed -n 2p)
fi

case "$EVENT" in
  Stop) EVENT="stop" ;;
  Notification) EVENT="notification" ;;
  StopFailure) EVENT="error" ;;
  *) EVENT=$(echo "$EVENT" | tr '[:upper:]' '[:lower:]') ;;
esac

SESSION_ID="\${DECK_SESSION_ID:-}"

if [ -n "$CWD" ] && [ -n "$EVENT" ]; then
  mkdir -p "$HOME/.deck"
  printf '%s|%s|%d|%s\n' "$CWD" "$EVENT" "$(date +%s)" "$SESSION_ID" >> "$HOME/.deck/events.log"
fi

exit 0
`

export function ensureHookHandler(): void {
  mkdirSync(DECK_DIR, { recursive: true, mode: 0o755 })
  writeFileSync(HOOK_HANDLER_DEST, HOOK_HANDLER_CONTENT, 'utf8')
  chmodSync(HOOK_HANDLER_DEST, 0o755)
}

export function discoverInstances(): string[] {
  const found: string[] = []
  const claudeDir = join(HOME, '.claude')
  if (existsSync(claudeDir)) found.push(claudeDir)

  try {
    const entries = readdirSync(HOME, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('.claude-')) {
        found.push(join(HOME, entry.name))
      }
    }
  } catch {
    // HOME not readable — skip
  }

  return found
}

export function checkInstanceStatus(instancePath: string): HookInstanceStatus {
  const settingsFile = join(instancePath, 'settings.json')
  if (!existsSync(settingsFile)) {
    return { path: instancePath, status: 'not-found', detail: 'settings.json not found' }
  }

  let settings: Record<string, unknown>
  try {
    settings = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>
  } catch {
    return { path: instancePath, status: 'not-found', detail: 'Invalid settings.json' }
  }

  const hooks = (settings.hooks ?? {}) as Record<
    string,
    Array<{ hooks?: Array<{ type?: string; command?: string }> }>
  >

  let installedCount = 0
  for (const event of HOOK_EVENTS) {
    const entries = hooks[event] ?? []
    for (const entry of entries) {
      if ((entry.hooks ?? []).some((h) => h.command?.includes(MARKER))) {
        installedCount++
        break
      }
    }
  }

  if (installedCount === 0) {
    return { path: instancePath, status: 'not-installed', detail: 'Not installed' }
  }
  if (installedCount === HOOK_EVENTS.length) {
    return { path: instancePath, status: 'installed', detail: 'Installed' }
  }
  return {
    path: instancePath,
    status: 'partial',
    detail: `Partial (${installedCount}/${HOOK_EVENTS.length})`
  }
}

export function getStatus(instancePaths?: string[]): HookInstanceStatus[] {
  const paths = instancePaths ?? discoverInstances()
  return paths.map(checkInstanceStatus)
}

export function installHooks(instancePaths?: string[]): HookInstanceStatus[] {
  ensureHookHandler()
  const paths = instancePaths ?? discoverInstances()
  const results: HookInstanceStatus[] = []

  for (const instancePath of paths) {
    results.push(installInstance(instancePath))
  }
  return results
}

export function uninstallHooks(instancePaths?: string[]): HookInstanceStatus[] {
  const paths = instancePaths ?? discoverInstances()
  const results: HookInstanceStatus[] = []
  for (const instancePath of paths) {
    results.push(uninstallInstance(instancePath))
  }
  return results
}

function installInstance(instancePath: string): HookInstanceStatus {
  const settingsFile = join(instancePath, 'settings.json')

  if (!existsSync(settingsFile)) {
    try {
      writeFileSync(settingsFile, '{}\n', 'utf8')
    } catch (err) {
      return {
        path: instancePath,
        status: 'not-found',
        detail: `Cannot create settings.json: ${err}`
      }
    }
  }

  const existing = checkInstanceStatus(instancePath)
  if (existing.status === 'installed') return existing

  let settings: Record<string, unknown>
  try {
    settings = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>
  } catch {
    return { path: instancePath, status: 'not-found', detail: 'Invalid settings.json' }
  }

  // Backup
  const backup = `${settingsFile}.bak.${Date.now()}`
  try {
    copyFileSync(settingsFile, backup)
  } catch {
    // Non-fatal — proceed without backup
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {}
  }

  const hooks = settings.hooks as Record<
    string,
    Array<{ hooks: Array<{ type: string; command: string }> }>
  >

  for (const event of HOOK_EVENTS) {
    const entries = hooks[event] ?? []
    const alreadyInstalled = entries.some((entry) =>
      (entry.hooks ?? []).some((h) => h.command?.includes(MARKER))
    )
    if (!alreadyInstalled) {
      entries.push({ hooks: [{ type: 'command', command: HOOK_HANDLER_DEST }] })
    }
    hooks[event] = entries
  }

  try {
    const tmp = `${settingsFile}.tmp`
    writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8')
    // Atomic rename
    renameSync(tmp, settingsFile)
  } catch (err) {
    return { path: instancePath, status: 'not-found', detail: `Write failed: ${err}` }
  }

  return { path: instancePath, status: 'installed', detail: 'Installed' }
}

function uninstallInstance(instancePath: string): HookInstanceStatus {
  const settingsFile = join(instancePath, 'settings.json')
  if (!existsSync(settingsFile)) {
    return { path: instancePath, status: 'not-found', detail: 'settings.json not found' }
  }

  const existing = checkInstanceStatus(instancePath)
  if (existing.status === 'not-installed') return existing

  let settings: Record<string, unknown>
  try {
    settings = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>
  } catch {
    return { path: instancePath, status: 'not-found', detail: 'Invalid settings.json' }
  }

  const backup = `${settingsFile}.bak.${Date.now()}`
  try {
    copyFileSync(settingsFile, backup)
  } catch {
    // Non-fatal
  }

  const hooks = (settings.hooks ?? {}) as Record<
    string,
    Array<{ hooks?: Array<{ type?: string; command?: string }> }>
  >

  for (const event of HOOK_EVENTS) {
    const entries = hooks[event] ?? []
    const cleaned = entries
      .map((entry) => ({
        ...entry,
        hooks: (entry.hooks ?? []).filter((h) => !h.command?.includes(MARKER))
      }))
      .filter((entry) => (entry.hooks ?? []).length > 0)

    if (cleaned.length > 0) {
      hooks[event] = cleaned
    } else {
      delete hooks[event]
    }
  }

  if (Object.keys(hooks).length === 0) {
    delete settings.hooks
  }

  try {
    const tmp = `${settingsFile}.tmp`
    writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8')
    renameSync(tmp, settingsFile)
  } catch (err) {
    return { path: instancePath, status: 'not-found', detail: `Write failed: ${err}` }
  }

  return { path: instancePath, status: 'not-installed', detail: 'Uninstalled' }
}
