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
  }
]

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
