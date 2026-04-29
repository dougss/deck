import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import { PLANNER_SYSTEM_PROMPT } from '../shared/planner-prompt'
import type { PtyRegistry } from './pty-registry'
import type { PtyManager } from './pty-manager'
import type {
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

export class SessionManager extends EventEmitter<EventMap> {
  private readonly attached = new Map<SessionId, AttachRecord>()

  constructor(
    private readonly db: Database,
    private readonly ptyRegistry: PtyRegistry
  ) {
    super()
    this.resetStaleStatuses()
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
      type: (row.type === 'shell' ? 'shell' : 'claude-code') as SessionType,
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
    const type: SessionType = req.type === 'shell' ? 'shell' : 'claude-code'
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
      const promptInline = PLANNER_SYSTEM_PROMPT.split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
      command = `claude --session-id ${claudeSessionId} --disallowedTools Bash Edit Write --append-system-prompt "${promptInline}"`
    } else {
      command = type === 'shell' ? (req.command ?? '') : validateNonEmpty('command', req.command)
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

    const handleExit = (): void => {
      this.handleUnexpectedExit(id)
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

  private handleUnexpectedExit(id: SessionId): void {
    const record = this.attached.get(id)
    if (!record) return
    this.attached.delete(id)

    const row = this.db.prepare<[string], SessionRow>(`SELECT * FROM sessions WHERE id = ?`).get(id)
    if (!row) return

    const now = Date.now()
    this.db
      .prepare(`UPDATE sessions SET status = 'idle', last_active_at = ? WHERE id = ?`)
      .run(now, id)

    const session = this.get(id)!
    this.emit('updated', { type: 'updated', session })
  }
}
