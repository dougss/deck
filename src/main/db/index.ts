import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { migrate } from './migrations'
import { seedDefaults } from './seed'

export interface InitDatabaseResult {
  db: DatabaseType
  isFreshInstall: boolean
  fromVersion: number
  toVersion: number
}

export function initDatabase(dbPath: string): InitDatabaseResult {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')

  const { fromVersion, toVersion, applied } = migrate(db)
  const isFreshInstall = fromVersion === 0 && applied.includes(1)

  if (isFreshInstall) {
    seedDefaults(db)
  }

  return { db, isFreshInstall, fromVersion, toVersion }
}
