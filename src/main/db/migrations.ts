import type { Database } from 'better-sqlite3'
import schemaSql from './schema.sql?raw'

interface Migration {
  version: number
  up: (db: Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db): void => {
      db.exec(schemaSql)
    }
  },
  {
    version: 2,
    up: (db): void => {
      db.exec(`ALTER TABLE sessions ADD COLUMN kind TEXT NOT NULL DEFAULT 'executor'`)
    }
  },
  {
    version: 3,
    up: (db): void => {
      db.exec(`ALTER TABLE sessions ADD COLUMN type TEXT NOT NULL DEFAULT 'claude-code'`)
    }
  }
]

export const LATEST_VERSION = migrations[migrations.length - 1].version

export interface MigrateResult {
  fromVersion: number
  toVersion: number
  applied: number[]
}

export function migrate(db: Database): MigrateResult {
  const fromVersion = db.pragma('user_version', { simple: true }) as number
  const applied: number[] = []

  for (const m of migrations) {
    if (m.version <= fromVersion) continue
    db.transaction(() => {
      m.up(db)
      db.pragma(`user_version = ${m.version}`)
    })()
    applied.push(m.version)
  }

  const toVersion = db.pragma('user_version', { simple: true }) as number
  return { fromVersion, toVersion, applied }
}
