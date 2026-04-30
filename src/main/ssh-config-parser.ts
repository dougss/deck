import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'
import { homedir } from 'node:os'

export interface SshHost {
  alias: string
  hostname: string | null
  user: string | null
  port: number | null
}

function hasWildcard(s: string): boolean {
  return s.includes('*') || s.includes('?')
}

function resolveIncludePaths(raw: string, baseDir: string): string[] {
  const expanded = raw.startsWith('~') ? join(homedir(), raw.slice(1)) : resolve(baseDir, raw)
  const dir = dirname(expanded)
  const base = basename(expanded)

  if (!hasWildcard(base)) return [expanded]
  if (!existsSync(dir)) return []

  try {
    const pattern = new RegExp(
      '^' + base.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    )
    return readdirSync(dir)
      .filter((f) => pattern.test(f))
      .sort()
      .map((f) => join(dir, f))
  } catch {
    return []
  }
}

function parseFile(filePath: string, visited: Set<string>): SshHost[] {
  const realPath = resolve(filePath)
  if (visited.has(realPath) || !existsSync(realPath)) return []
  visited.add(realPath)

  let content: string
  try {
    content = readFileSync(realPath, 'utf-8')
  } catch {
    return []
  }

  const hosts: SshHost[] = []
  let currentAliases: string[] = []
  let currentHostname: string | null = null
  let currentUser: string | null = null
  let currentPort: number | null = null

  function flush(): void {
    for (const alias of currentAliases) {
      hosts.push({ alias, hostname: currentHostname, user: currentUser, port: currentPort })
    }
    currentAliases = []
    currentHostname = null
    currentUser = null
    currentPort = null
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const spaceIdx = trimmed.search(/\s/)
    if (spaceIdx === -1) continue

    const keyword = trimmed.slice(0, spaceIdx).toLowerCase()
    const rest = trimmed.slice(spaceIdx).trim()

    switch (keyword) {
      case 'host': {
        flush()
        currentAliases = rest.split(/\s+/).filter((a) => !hasWildcard(a))
        break
      }
      case 'hostname':
        currentHostname = rest
        break
      case 'user':
        currentUser = rest
        break
      case 'port': {
        const p = parseInt(rest, 10)
        if (!isNaN(p)) currentPort = p
        break
      }
      case 'include': {
        flush()
        const paths = resolveIncludePaths(rest, dirname(realPath))
        for (const p of paths) {
          hosts.push(...parseFile(p, visited))
        }
        break
      }
    }
  }

  flush()
  return hosts
}

export function parseSshConfig(configPath?: string): SshHost[] {
  const path = configPath ?? join(homedir(), '.ssh', 'config')
  return parseFile(path, new Set())
}
