import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'

export interface DefaultWorkspace {
  name: string
  accent: string
  rel: string
}

export const DEFAULT_WORKSPACES: DefaultWorkspace[] = [
  { name: 'Leve Saúde', accent: '#06b6d4', rel: 'Projects/Leve_saude' },
  { name: 'DevSkin', accent: '#ec4899', rel: 'Projects/DevSkin' },
  { name: 'Personal', accent: '#8b5cf6', rel: '' }
]

function resolvePath(rel: string): string {
  if (rel.startsWith('/')) return rel
  return rel === '' ? homedir() : join(homedir(), rel)
}

export function seedDefaults(
  db: Database,
  defaults: DefaultWorkspace[] = DEFAULT_WORKSPACES
): void {
  const insert = db.prepare(
    `INSERT INTO workspaces
      (id, name, accent_color, path, needs_setup, ordinal, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const now = Date.now()

  db.transaction(() => {
    defaults.forEach((w, idx) => {
      const abs = resolvePath(w.rel)
      const needsSetup = existsSync(abs) ? 0 : 1
      insert.run(randomUUID(), w.name, w.accent, abs, needsSetup, idx, now)
    })
  })()
}
