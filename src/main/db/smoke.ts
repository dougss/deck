import { existsSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { initDatabase } from './index'
import { migrate } from './migrations'
import { seedDefaults } from './seed'

interface TestResult {
  name: string
  ok: boolean
  detail?: string
}

const SMOKE_DB = '/tmp/deck-smoke.db'

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = SMOKE_DB + ext
    if (existsSync(p)) rmSync(p)
  }
}

function record(results: TestResult[], name: string, fn: () => string | void): void {
  try {
    const detail = fn()
    results.push({ name, ok: true, detail: detail ?? undefined })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.push({ name, ok: false, detail: msg })
  }
}

export async function runSmoke(): Promise<number> {
  cleanup()
  const results: TestResult[] = []

  record(results, '1. initDatabase creates file + applies migration v1', () => {
    const { db, isFreshInstall, fromVersion, toVersion } = initDatabase(SMOKE_DB)
    if (!existsSync(SMOKE_DB)) throw new Error('DB file not created')
    if (fromVersion !== 0) throw new Error(`expected fromVersion=0, got ${fromVersion}`)
    if (toVersion !== 1) throw new Error(`expected toVersion=1, got ${toVersion}`)
    if (!isFreshInstall) throw new Error('expected isFreshInstall=true')
    db.close()
    return `v${fromVersion} -> v${toVersion}, fresh=${isFreshInstall}`
  })

  record(results, '2. user_version === 1', () => {
    const { db } = initDatabase(SMOKE_DB)
    const v = db.pragma('user_version', { simple: true }) as number
    db.close()
    if (v !== 1) throw new Error(`expected 1, got ${v}`)
    return `user_version=${v}`
  })

  record(results, '3. 3 workspaces seeded', () => {
    const { db } = initDatabase(SMOKE_DB)
    const { c } = db.prepare('SELECT COUNT(*) as c FROM workspaces').get() as { c: number }
    db.close()
    if (c !== 3) throw new Error(`expected 3, got ${c}`)
    return `count=${c}`
  })

  record(results, '4. re-init does not duplicate seed', () => {
    const { db, isFreshInstall } = initDatabase(SMOKE_DB)
    const { c } = db.prepare('SELECT COUNT(*) as c FROM workspaces').get() as { c: number }
    db.close()
    if (c !== 3) throw new Error(`expected 3 after re-init, got ${c}`)
    if (isFreshInstall) throw new Error('expected isFreshInstall=false on 2nd init')
    return `count=${c}, fresh=${isFreshInstall}`
  })

  record(results, '5. needs_setup reflects fs existence', () => {
    const { db } = initDatabase(SMOKE_DB)
    const rows = db
      .prepare('SELECT name, path, needs_setup FROM workspaces ORDER BY ordinal')
      .all() as { name: string; path: string; needs_setup: number }[]
    db.close()
    if (rows.length !== 3) throw new Error('expected 3 rows')
    const personal = rows.find((r) => r.name === 'Personal')
    if (!personal) throw new Error('Personal missing')
    if (personal.needs_setup !== 0) throw new Error('Personal (HOME) should always exist')
    return rows.map((r) => `${r.name}=${r.needs_setup === 0 ? 'ok' : 'setup'}`).join(', ')
  })

  record(results, '6. ordinal + accent colors correct', () => {
    const { db } = initDatabase(SMOKE_DB)
    const rows = db
      .prepare('SELECT name, accent_color, ordinal FROM workspaces ORDER BY ordinal')
      .all() as { name: string; accent_color: string; ordinal: number }[]
    db.close()
    const expected = [
      { name: 'Leve Saúde', accent_color: '#06b6d4', ordinal: 0 },
      { name: 'DevSkin', accent_color: '#ec4899', ordinal: 1 },
      { name: 'Personal', accent_color: '#8b5cf6', ordinal: 2 }
    ]
    for (let i = 0; i < 3; i++) {
      const got = rows[i]
      const want = expected[i]
      if (got.name !== want.name) throw new Error(`row ${i} name: ${got.name} !== ${want.name}`)
      if (got.accent_color !== want.accent_color)
        throw new Error(`row ${i} accent: ${got.accent_color} !== ${want.accent_color}`)
      if (got.ordinal !== want.ordinal) throw new Error(`row ${i} ordinal mismatch`)
    }
    return '3 rows match name/accent/ordinal'
  })

  record(results, '7. CASCADE DELETE removes sessions', () => {
    const { db } = initDatabase(SMOKE_DB)

    const wsId = randomUUID()
    const now = Date.now()
    db.prepare(
      `INSERT INTO workspaces (id, name, accent_color, path, needs_setup, ordinal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(wsId, 'Ephemeral', '#ffffff', '/tmp/ephemeral', 1, 99, now)

    const insertSession = db.prepare(
      `INSERT INTO sessions (id, workspace_id, name, cwd, command, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    insertSession.run(randomUUID(), wsId, 's1', '/tmp', 'claude', now, now)
    insertSession.run(randomUUID(), wsId, 's2', '/tmp', 'claude', now, now)

    const before = db
      .prepare('SELECT COUNT(*) as c FROM sessions WHERE workspace_id = ?')
      .get(wsId) as { c: number }
    if (before.c !== 2) throw new Error(`expected 2 sessions before, got ${before.c}`)

    db.prepare('DELETE FROM workspaces WHERE id = ?').run(wsId)

    const after = db
      .prepare('SELECT COUNT(*) as c FROM sessions WHERE workspace_id = ?')
      .get(wsId) as { c: number }
    db.close()
    if (after.c !== 0)
      throw new Error(
        `CASCADE failed: expected 0 sessions after workspace delete, got ${after.c}. PRAGMA foreign_keys likely off.`
      )
    return `2 sessions -> 0 after workspace delete`
  })

  record(results, '8. seedDefaults marks missing path as needs_setup=1', () => {
    const fakePath = '/tmp/workspace-fake-nao-existe-deck-smoke'
    if (existsSync(fakePath)) rmSync(fakePath, { recursive: true, force: true })

    const isolatedDbPath = '/tmp/deck-smoke-isolated.db'
    for (const ext of ['', '-wal', '-shm']) {
      const p = isolatedDbPath + ext
      if (existsSync(p)) rmSync(p)
    }

    const db = new Database(isolatedDbPath)
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    migrate(db)
    seedDefaults(db, [{ name: 'FakeMissing', accent: '#ffffff', rel: fakePath }])

    const row = db
      .prepare('SELECT name, path, needs_setup FROM workspaces WHERE name = ?')
      .get('FakeMissing') as { name: string; path: string; needs_setup: number } | undefined

    db.close()
    for (const ext of ['', '-wal', '-shm']) {
      const p = isolatedDbPath + ext
      if (existsSync(p)) rmSync(p)
    }

    if (!row) throw new Error('FakeMissing workspace not inserted')
    if (row.path !== fakePath) throw new Error(`path mismatch: ${row.path}`)
    if (row.needs_setup !== 1)
      throw new Error(`expected needs_setup=1 for missing path, got ${row.needs_setup}`)
    return `path=${fakePath} → needs_setup=1`
  })

  const padded = results.map((r, i) => ({
    line: `${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`,
    ok: r.ok,
    i
  }))

  console.log('\n=== deck DB smoke ===')
  for (const p of padded) console.log(p.line)

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} passed`)

  cleanup()
  return failed === 0 ? 0 : 1
}
