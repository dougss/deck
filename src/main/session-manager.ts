import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import type { Database } from 'better-sqlite3'
import { PLANNER_SYSTEM_PROMPT } from '../shared/planner-prompt'
import type { PtyRegistry } from './pty-registry'
import type { PtyManager } from './pty-manager'
import type { PtyExitInfo } from './pty-manager'
import type {
  DeckSettings,
  PtyId,
  Session,
  SessionCreateRequest,
  SessionId,
  SessionPatch,
  SessionStatus,
  SessionType,
  SessionUpdateEvent,
  WorkspaceId
} from '../shared/ipc'

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

const ATTACH_DEFAULT_COLS = 80
const ATTACH_DEFAULT_ROWS = 24
const PATCHABLE_FIELDS = new Set<string>(['name', 'cwd', 'command', 'subText'])

interface SessionRow {
  id: string
  workspace_id: string
  name: string
  cwd: string
  command: string
  sub_text: string
  status: string
  kind: string
  type: string
  claude_session_id: string | null
  parent_session_id: string | null
  created_at: number
  last_active_at: number
}

interface AttachRecord {
  ptyId: PtyId
  pid: number | null
  unlistenExit: () => void
}

interface SshReconnectState {
  attempts: number
  timer: ReturnType<typeof setTimeout> | null
}

export interface PtyAttachedEvent {
  sessionId: SessionId
  ptyId: PtyId
  manager: PtyManager
}

type EventMap = {
  updated: [SessionUpdateEvent]
  ptyAttached: [PtyAttachedEvent]
}

export class SessionNotFoundError extends Error {
  constructor(id: SessionId) {
    super(`Session not found: ${id}`)
    this.name = 'SessionNotFoundError'
  }
}

export class SessionAlreadyAttachedError extends Error {
  constructor(id: SessionId) {
    super(`Session already attached: ${id}`)
    this.name = 'SessionAlreadyAttachedError'
  }
}

export class SessionNotAttachedError extends Error {
  constructor(id: SessionId) {
    super(`Session not attached: ${id}`)
    this.name = 'SessionNotAttachedError'
  }
}

function toStatus(raw: string): SessionStatus {
  return raw === 'working' ? 'working' : 'idle'
}

function validateNonEmpty(field: string, value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new Error(`${field} must be non-empty`)
  return trimmed
}

const SSH_BACKOFF_MS = [1000, 2000, 4000]

export class SessionManager extends EventEmitter<EventMap> {
  private readonly attached = new Map<SessionId, AttachRecord>()
  private readonly sshReconnect = new Map<SessionId, SshReconnectState>()

  constructor(
    private readonly db: Database,
    private readonly ptyRegistry: PtyRegistry,
    private readonly getSettings: () => DeckSettings
  ) {
    super()
    this.resetStaleStatuses()
  }

  private resolvePlannerConfig(workspaceId: WorkspaceId): {
    prompt: string
    disallowedTools: string | null
    allowedTools: string | null
  } {
    const wsRow = this.db
      .prepare<
        [string],
        {
          planner_prompt: string | null
          planner_disallowed_tools: string | null
          planner_allowed_tools: string | null
        }
      >(
        `SELECT planner_prompt, planner_disallowed_tools, planner_allowed_tools FROM workspaces WHERE id = ?`
      )
      .get(workspaceId)
    const settings = this.getSettings()
    return {
      prompt: wsRow?.planner_prompt ?? settings.plannerPrompt ?? PLANNER_SYSTEM_PROMPT,
      disallowedTools:
        wsRow?.planner_disallowed_tools ??
        settings.plannerDisallowedTools ??
        'Bash Edit Write MultiEdit NotebookEdit',
      allowedTools: wsRow?.planner_allowed_tools ?? settings.plannerAllowedTools ?? null
    }
  }

  private resetStaleStatuses(): void {
    this.db.prepare(`UPDATE sessions SET status = 'idle' WHERE status <> 'idle'`).run()
  }

  private rowToSession(row: SessionRow): Session {
    const record = this.attached.get(row.id)
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      cwd: row.cwd,
      command: row.command,
      subText: row.sub_text,
      status: toStatus(row.status),
      kind: (row.kind === 'planner' ? 'planner' : 'executor') as Session['kind'],
      type: (row.type === 'ssh'
        ? 'ssh'
        : row.type === 'shell'
          ? 'shell'
          : row.type === 'gemini'
            ? 'gemini'
            : row.type === 'codex'
              ? 'codex'
              : 'claude-code') as SessionType,
      claudeSessionId: row.claude_session_id ?? null,
      parentSessionId: row.parent_session_id ?? null,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      ptyId: record?.ptyId ?? null,
      pid: record?.pid ?? null
    }
  }

  list(workspaceId?: WorkspaceId): Session[] {
    const rows = workspaceId
      ? this.db
          .prepare<
            [string],
            SessionRow
          >(`SELECT * FROM sessions WHERE workspace_id = ? ORDER BY last_active_at DESC`)
          .all(workspaceId)
      : this.db.prepare<[], SessionRow>(`SELECT * FROM sessions ORDER BY last_active_at DESC`).all()
    return rows.map((r) => this.rowToSession(r))
  }

  get(id: SessionId): Session | null {
    const row = this.db.prepare<[string], SessionRow>(`SELECT * FROM sessions WHERE id = ?`).get(id)
    return row ? this.rowToSession(row) : null
  }

  create(req: SessionCreateRequest): Session {
    const name = validateNonEmpty('name', req.name)
    const cwd = validateNonEmpty('cwd', req.cwd)
    const type: SessionType =
      req.type === 'ssh'
        ? 'ssh'
        : req.type === 'shell'
          ? 'shell'
          : req.type === 'gemini'
            ? 'gemini'
            : req.type === 'codex'
              ? 'codex'
              : 'claude-code'
    const subText = req.subText ?? ''
    const kind = req.kind ?? 'executor'

    const workspaceRow = this.db
      .prepare<[string], { id: string }>(`SELECT id FROM workspaces WHERE id = ?`)
      .get(req.workspaceId)
    if (!workspaceRow) throw new Error(`Workspace not found: ${req.workspaceId}`)

    let command: string
    let claudeSessionId: string | null = null

    let parentSessionId: string | null = null

    if (kind === 'planner') {
      if (!req.parentSessionId) throw new Error('parentSessionId is required for planner sessions')
      parentSessionId = req.parentSessionId

      const existing = this.db
        .prepare<
          [string],
          { c: number }
        >(`SELECT COUNT(*) as c FROM sessions WHERE parent_session_id = ? AND kind = 'planner'`)
        .get(parentSessionId)
      if (existing && existing.c > 0) throw new Error('Session already has a planner')

      claudeSessionId = randomUUID()
      const config = this.resolvePlannerConfig(req.workspaceId)
      const promptNormalized = config.prompt
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      const parts = [`claude`, `--session-id`, claudeSessionId]
      if (config.disallowedTools) parts.push(`--disallowedTools`, config.disallowedTools)
      if (config.allowedTools) parts.push(`--allowedTools`, config.allowedTools)
      parts.push(`--append-system-prompt`, shellQuote(promptNormalized))
      command = parts.join(' ')
    } else if (type === 'shell') {
      command = req.command ?? ''
    } else if (type === 'codex') {
      const explicit = (req.command ?? '').trim()
      if (explicit.length > 0) {
        command = explicit
      } else {
        const codexPath = (this.getSettings().codexPath ?? '').trim()
        command = codexPath.length > 0 ? codexPath : 'codex'
      }
    } else {
      command = validateNonEmpty('command', req.command)
    }

    const id = randomUUID()
    const now = Date.now()

    this.db
      .prepare(
        `INSERT INTO sessions
          (id, workspace_id, name, cwd, command, sub_text, status, kind, type, claude_session_id, parent_session_id, created_at, last_active_at)
         VALUES (?, ?, ?, ?, ?, ?, 'idle', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        req.workspaceId,
        name,
        cwd,
        command,
        subText,
        kind,
        type,
        claudeSessionId,
        parentSessionId,
        now,
        now
      )

    const session = this.get(id)!
    this.emit('updated', { type: 'created', session })
    return session
  }

  update(id: SessionId, patch: SessionPatch): Session {
    const current = this.get(id)
    if (!current) throw new SessionNotFoundError(id)

    for (const key of Object.keys(patch)) {
      if (!PATCHABLE_FIELDS.has(key)) {
        throw new Error(`Field "${key}" is not patchable via update() (manager-owned)`)
      }
    }

    const next: Session = { ...current }
    if (patch.name !== undefined) next.name = validateNonEmpty('name', patch.name)
    if (patch.cwd !== undefined) next.cwd = validateNonEmpty('cwd', patch.cwd)
    if (patch.command !== undefined) next.command = validateNonEmpty('command', patch.command)
    if (patch.subText !== undefined) next.subText = patch.subText

    const apply = this.db.transaction(() => {
      if (patch.name !== undefined) {
        this.db.prepare(`UPDATE sessions SET name = ? WHERE id = ?`).run(next.name, id)
      }
      if (patch.cwd !== undefined) {
        this.db.prepare(`UPDATE sessions SET cwd = ? WHERE id = ?`).run(next.cwd, id)
      }
      if (patch.command !== undefined) {
        this.db.prepare(`UPDATE sessions SET command = ? WHERE id = ?`).run(next.command, id)
      }
      if (patch.subText !== undefined) {
        this.db.prepare(`UPDATE sessions SET sub_text = ? WHERE id = ?`).run(next.subText, id)
      }
    })
    apply()

    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })
    return session
  }

  delete(id: SessionId): void {
    const current = this.get(id)
    if (!current) throw new SessionNotFoundError(id)

    const sshState = this.sshReconnect.get(id)
    if (sshState?.timer) {
      clearTimeout(sshState.timer)
      this.sshReconnect.delete(id)
    }

    if (this.attached.has(id)) {
      this.detach(id)
    }

    const info = this.db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id)
    if (info.changes === 0) throw new SessionNotFoundError(id)
    this.emit('updated', { type: 'deleted', id })
  }

  attach(id: SessionId, opts?: { cols?: number; rows?: number }): Session {
    const current = this.get(id)
    if (!current) throw new SessionNotFoundError(id)
    if (this.attached.has(id)) throw new SessionAlreadyAttachedError(id)

    const cols = opts?.cols ?? ATTACH_DEFAULT_COLS
    const rows = opts?.rows ?? ATTACH_DEFAULT_ROWS

    if (current.type === 'ssh') {
      this.sshReconnect.set(id, { attempts: 0, timer: null })
      return this.spawnSshPty(id, current.command, cols, rows)
    }

    const direnvPrefix =
      'eval "$(command -v direnv >/dev/null 2>&1 && direnv export zsh 2>/dev/null)";'

    let spawnCommand = current.command
    if (current.kind === 'planner') {
      const newSessionId = randomUUID()
      const newCommand = current.command.replace(
        /--(?:session-id|resume)\s+\S+/,
        `--session-id ${newSessionId}`
      )
      this.db
        .prepare(`UPDATE sessions SET claude_session_id = ?, command = ? WHERE id = ?`)
        .run(newSessionId, newCommand, id)
      spawnCommand = newCommand
    }

    const spawnArgs =
      current.type === 'shell' ? ['-il'] : ['-ilc', `${direnvPrefix} ${spawnCommand}`]
    const { id: ptyId, manager } = this.ptyRegistry.create({
      cwd: current.cwd,
      cols,
      rows,
      shell: '/bin/zsh',
      args: spawnArgs,
      env: { DECK_SESSION_ID: id }
    })

    const now = Date.now()
    try {
      this.db
        .prepare(`UPDATE sessions SET status = 'working', last_active_at = ? WHERE id = ?`)
        .run(now, id)
    } catch (err) {
      manager.kill()
      throw err
    }

    const handleExit = (info: PtyExitInfo): void => {
      this.handleUnexpectedExit(id, info.exitCode)
    }
    manager.on('exit', handleExit)
    const unlistenExit = (): void => {
      manager.off('exit', handleExit)
    }
    this.attached.set(id, { ptyId, pid: manager.pid, unlistenExit })

    this.emit('ptyAttached', { sessionId: id, ptyId, manager })

    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })
    return session
  }

  detach(id: SessionId): Session {
    const sshState = this.sshReconnect.get(id)
    if (sshState?.timer) {
      clearTimeout(sshState.timer)
      this.sshReconnect.delete(id)
    }

    const record = this.attached.get(id)
    if (!record) throw new SessionNotAttachedError(id)
    const current = this.get(id)
    if (!current) throw new SessionNotFoundError(id)

    // NOTE: We only remove OUR internal exit listener here.
    // The fan-out listener wired by registerSessionHandlers
    // (src/main/ipc-handlers-sessions.ts) stays subscribed and will
    // emit pty:exit to the renderer when manager.kill() triggers the
    // exit event below. This is intentional — Terminal component
    // (Task 10) needs to know the PTY died to display '[exit N]' in xterm.
    // Important: by the time pty:exit reaches the renderer, session
    // status is already 'idle' in the store (Task 6+). Renderer MUST NOT
    // react to pty:exit by calling detach() or updating session state —
    // that already happened here.
    record.unlistenExit()
    this.attached.delete(id)

    const now = Date.now()
    this.db
      .prepare(`UPDATE sessions SET status = 'idle', last_active_at = ? WHERE id = ?`)
      .run(now, id)

    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })

    this.ptyRegistry.get(record.ptyId)?.kill()

    return session
  }

  detachAllInWorkspace(workspaceId: WorkspaceId): void {
    const rows = this.db
      .prepare<[string], { id: string }>(`SELECT id FROM sessions WHERE workspace_id = ?`)
      .all(workspaceId)
    for (const row of rows) {
      if (this.attached.has(row.id)) {
        this.detach(row.id)
      }
    }
  }

  private handleUnexpectedExit(id: SessionId, exitCode: number): void {
    const record = this.attached.get(id)
    if (!record) return
    this.attached.delete(id)

    const row = this.db.prepare<[string], SessionRow>(`SELECT * FROM sessions WHERE id = ?`).get(id)
    if (!row) return

    if (row.type === 'ssh' && exitCode !== 0) {
      const state = this.sshReconnect.get(id) ?? { attempts: 0, timer: null }
      state.attempts++
      if (state.attempts <= 3) {
        const delay = SSH_BACKOFF_MS[state.attempts - 1]
        this.db
          .prepare(`UPDATE sessions SET sub_text = ?, last_active_at = ? WHERE id = ?`)
          .run(`reconnecting (${state.attempts}/3)…`, Date.now(), id)
        const session = this.get(id)!
        this.emit('updated', { type: 'updated', session })
        state.timer = setTimeout(() => this.doSshReconnect(id), delay)
        this.sshReconnect.set(id, state)
      } else {
        this.sshReconnect.delete(id)
        this.db
          .prepare(
            `UPDATE sessions SET status = 'idle', sub_text = 'connection failed', last_active_at = ? WHERE id = ?`
          )
          .run(Date.now(), id)
        const session = this.get(id)!
        this.emit('updated', { type: 'updated', session })
      }
      return
    }

    const now = Date.now()
    this.db
      .prepare(`UPDATE sessions SET status = 'idle', last_active_at = ? WHERE id = ?`)
      .run(now, id)
    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })
  }

  private spawnSshPty(id: SessionId, alias: string, cols: number, rows: number): Session {
    const { id: ptyId, manager } = this.ptyRegistry.create({
      cwd: homedir(),
      cols,
      rows,
      shell: '/usr/bin/ssh',
      args: [alias],
      env: { DECK_SESSION_ID: id }
    })

    const now = Date.now()
    try {
      this.db
        .prepare(`UPDATE sessions SET status = 'working', last_active_at = ? WHERE id = ?`)
        .run(now, id)
    } catch (err) {
      manager.kill()
      throw err
    }

    const handleExit = (info: PtyExitInfo): void => {
      this.handleUnexpectedExit(id, info.exitCode)
    }
    manager.on('exit', handleExit)
    const unlistenExit = (): void => {
      manager.off('exit', handleExit)
    }
    this.attached.set(id, { ptyId, pid: manager.pid, unlistenExit })

    let firstData = false
    manager.on('data', () => {
      if (firstData) return
      firstData = true
      const state = this.sshReconnect.get(id)
      if (state) state.attempts = 0
    })

    this.emit('ptyAttached', { sessionId: id, ptyId, manager })
    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })
    return session
  }

  private doSshReconnect(id: SessionId): void {
    const state = this.sshReconnect.get(id)
    if (!state) return
    if (this.attached.has(id)) return

    const row = this.db.prepare<[string], SessionRow>(`SELECT * FROM sessions WHERE id = ?`).get(id)
    if (!row) {
      this.sshReconnect.delete(id)
      return
    }

    this.spawnSshPty(id, row.command, ATTACH_DEFAULT_COLS, ATTACH_DEFAULT_ROWS)
  }
}
