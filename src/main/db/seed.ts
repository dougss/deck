import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'

interface DefaultWorkspace {
  name: string
  accent: string
  rel: string
}

const DEFAULTS: DefaultWorkspace[] = [
  { name: 'Leve Saúde', accent: '#06b6d4', rel: 'Projects/Leve_saude' },
  { name: 'DevSkin', accent: '#ec4899', rel: 'Projects/DevSkin' },
  { name: 'Personal', accent: '#8b5cf6', rel: '' }
]

function resolvePath(rel: string): string {
  return rel === '' ? homedir() : join(homedir(), rel)
}

export function seedDefaults(db: Database): void {
  const insert = db.prepare(
    `INSERT INTO workspaces
      (id, name, accent_color, path, needs_setup, ordinal, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const now = Date.now()

  db.transaction(() => {
    DEFAULTS.forEach((w, idx) => {
      const abs = resolvePath(w.rel)
      const needsSetup = existsSync(abs) ? 0 : 1
      insert.run(randomUUID(), w.name, w.accent, abs, needsSetup, idx, now)
    })
  })()
}
