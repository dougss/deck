import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type {
  Workspace,
  WorkspaceCheckPathsResult,
  WorkspaceCreateRequest,
  WorkspaceId,
  WorkspacePatch,
  WorkspaceUpdateEvent
} from '../shared/ipc'

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export class WorkspaceOrdinalConflictError extends Error {
  constructor(ordinal: number) {
    super(`Ordinal ${ordinal} already in use`)
    this.name = 'WorkspaceOrdinalConflictError'
  }
}

interface WorkspaceRow {
  id: string
  name: string
  accent_color: string
  path: string
  needs_setup: number
  ordinal: number
  created_at: number
  planner_prompt: string | null
  planner_disallowed_tools: string | null
  planner_allowed_tools: string | null
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    accentColor: row.accent_color,
    path: row.path,
    needsSetup: row.needs_setup === 1,
    ordinal: row.ordinal,
    createdAt: row.created_at,
    plannerPrompt: row.planner_prompt ?? null,
    plannerDisallowedTools: row.planner_disallowed_tools ?? null,
    plannerAllowedTools: row.planner_allowed_tools ?? null
  }
}

function validateName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('name must be non-empty')
  return trimmed
}

function validateAccent(accent: string): string {
  if (!HEX_COLOR.test(accent)) {
    throw new Error(`Invalid accentColor: ${accent} (expected #rrggbb)`)
  }
  return accent
}

function validatePath(path: string): string {
  if (path.length === 0) throw new Error('path must be non-empty')
  return path
}

function isOrdinalConflict(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message
  return (
    msg.includes('UNIQUE constraint failed: workspaces.ordinal') ||
    msg.includes('idx_workspaces_ordinal')
  )
}

type EventMap = {
  updated: [WorkspaceUpdateEvent]
}

export class WorkspaceManager extends EventEmitter<EventMap> {
  constructor(private readonly db: Database) {
    super()
  }

  list(): Workspace[] {
    const rows = this.db
      .prepare<[], WorkspaceRow>(`SELECT * FROM workspaces ORDER BY ordinal ASC`)
      .all()
    return rows.map(rowToWorkspace)
  }

  get(id: WorkspaceId): Workspace | null {
    const row = this.db
      .prepare<[string], WorkspaceRow>(`SELECT * FROM workspaces WHERE id = ?`)
      .get(id)
    return row ? rowToWorkspace(row) : null
  }

  create(req: WorkspaceCreateRequest): Workspace {
    const name = validateName(req.name)
    const accent = validateAccent(req.accentColor)
    const path = validatePath(req.path)
    const id = randomUUID()
    const now = Date.now()
    const needsSetup = existsSync(path) ? 0 : 1

    const ordinal = req.ordinal ?? this.nextOrdinal()

    const plannerPrompt = req.plannerPrompt ?? null
    const plannerDisallowedTools = req.plannerDisallowedTools ?? null
    const plannerAllowedTools = req.plannerAllowedTools ?? null

    const insert = this.db.prepare(
      `INSERT INTO workspaces (id, name, accent_color, path, needs_setup, ordinal, created_at, planner_prompt, planner_disallowed_tools, planner_allowed_tools)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    try {
      insert.run(
        id,
        name,
        accent,
        path,
        needsSetup,
        ordinal,
        now,
        plannerPrompt,
        plannerDisallowedTools,
        plannerAllowedTools
      )
    } catch (err) {
      if (isOrdinalConflict(err)) throw new WorkspaceOrdinalConflictError(ordinal)
      throw err
    }

    const workspace = this.get(id)!
    this.emit('updated', { type: 'created', workspace })
    return workspace
  }

  update(id: WorkspaceId, patch: WorkspacePatch): Workspace {
    const current = this.get(id)
    if (!current) throw new Error(`Workspace not found: ${id}`)

    const next: Workspace = { ...current }
    if (patch.name !== undefined) next.name = validateName(patch.name)
    if (patch.accentColor !== undefined) next.accentColor = validateAccent(patch.accentColor)
    if (patch.ordinal !== undefined) next.ordinal = patch.ordinal
    if ('plannerPrompt' in patch) next.plannerPrompt = patch.plannerPrompt ?? null
    if ('plannerDisallowedTools' in patch)
      next.plannerDisallowedTools = patch.plannerDisallowedTools ?? null
    if ('plannerAllowedTools' in patch) next.plannerAllowedTools = patch.plannerAllowedTools ?? null

    const pathChanged = patch.path !== undefined && patch.path !== current.path
    if (patch.path !== undefined) next.path = validatePath(patch.path)
    if (pathChanged) next.needsSetup = !existsSync(next.path)

    const apply = this.db.transaction(() => {
      if (pathChanged) {
        this.db
          .prepare(`UPDATE workspaces SET path = ?, needs_setup = ? WHERE id = ?`)
          .run(next.path, next.needsSetup ? 1 : 0, id)
      }
      if (patch.name !== undefined) {
        this.db.prepare(`UPDATE workspaces SET name = ? WHERE id = ?`).run(next.name, id)
      }
      if (patch.accentColor !== undefined) {
        this.db
          .prepare(`UPDATE workspaces SET accent_color = ? WHERE id = ?`)
          .run(next.accentColor, id)
      }
      if (patch.ordinal !== undefined) {
        this.db.prepare(`UPDATE workspaces SET ordinal = ? WHERE id = ?`).run(next.ordinal, id)
      }
      if ('plannerPrompt' in patch) {
        this.db
          .prepare(`UPDATE workspaces SET planner_prompt = ? WHERE id = ?`)
          .run(next.plannerPrompt, id)
      }
      if ('plannerDisallowedTools' in patch) {
        this.db
          .prepare(`UPDATE workspaces SET planner_disallowed_tools = ? WHERE id = ?`)
          .run(next.plannerDisallowedTools, id)
      }
      if ('plannerAllowedTools' in patch) {
        this.db
          .prepare(`UPDATE workspaces SET planner_allowed_tools = ? WHERE id = ?`)
          .run(next.plannerAllowedTools, id)
      }
    })

    try {
      apply()
    } catch (err) {
      if (isOrdinalConflict(err)) throw new WorkspaceOrdinalConflictError(next.ordinal)
      throw err
    }

    const workspace = this.get(id)!
    this.emit('updated', { type: 'updated', workspace })
    return workspace
  }

  delete(id: WorkspaceId): void {
    const info = this.db.prepare(`DELETE FROM workspaces WHERE id = ?`).run(id)
    if (info.changes === 0) throw new Error(`Workspace not found: ${id}`)
    this.emit('updated', { type: 'deleted', id })
  }

  checkPaths(): WorkspaceCheckPathsResult {
    const rows = this.db.prepare<[], WorkspaceRow>(`SELECT * FROM workspaces`).all()
    const changed: Workspace[] = []
    const update = this.db.prepare(`UPDATE workspaces SET needs_setup = ? WHERE id = ?`)

    for (const row of rows) {
      const exists = existsSync(row.path)
      const desired = exists ? 0 : 1
      if (desired !== row.needs_setup) {
        update.run(desired, row.id)
        const workspace = this.get(row.id)!
        changed.push(workspace)
        this.emit('updated', { type: 'updated', workspace })
      }
    }

    return { changed }
  }

  private nextOrdinal(): number {
    const row = this.db
      .prepare<[], { max: number | null }>(`SELECT MAX(ordinal) AS max FROM workspaces`)
      .get()
    return (row?.max ?? -1) + 1
  }
}
