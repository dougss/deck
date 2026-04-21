import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { initDatabase } from './db'
import { WorkspaceManager, WorkspaceOrdinalConflictError } from './workspace-manager'
import type { Workspace, WorkspaceUpdateEvent } from '../shared/ipc'

interface TestResult {
  name: string
  ok: boolean
  detail?: string
}

const SMOKE_DB = '/tmp/deck-ws-smoke.db'

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

export async function runWsSmoke(): Promise<number> {
  cleanup()
  const results: TestResult[] = []

  const { db } = initDatabase(SMOKE_DB)
  const manager = new WorkspaceManager(db)

  const events: WorkspaceUpdateEvent[] = []
  manager.on('updated', (e) => events.push(e))

  record(results, '1. list() returns 3 seeded workspaces', () => {
    const list = manager.list()
    if (list.length !== 3) throw new Error(`expected 3, got ${list.length}`)
    const names = list.map((w) => w.name).join(',')
    return `[${names}]`
  })

  let createdId = ''
  record(results, '2. create() inserts + emits created event', () => {
    const before = events.length
    const tmpDir = '/tmp/deck-ws-smoke-created'
    mkdirSync(tmpDir, { recursive: true })
    const created = manager.create({
      name: 'Smoke WS',
      accentColor: '#00ff00',
      path: tmpDir
    })
    createdId = created.id
    if (!created.id) throw new Error('no id')
    if (created.ordinal !== 3) throw new Error(`expected ordinal=3, got ${created.ordinal}`)
    if (created.needsSetup) throw new Error('needsSetup should be false (dir exists)')
    const evt = events[before]
    if (evt?.type !== 'created') throw new Error(`expected created event, got ${evt?.type}`)
    rmSync(tmpDir, { recursive: true, force: true })
    return `id=${created.id.slice(0, 8)}… ordinal=${created.ordinal}`
  })

  record(results, '3. get(id) returns created workspace', () => {
    const ws = manager.get(createdId)
    if (!ws) throw new Error('not found')
    if (ws.name !== 'Smoke WS') throw new Error(`name mismatch: ${ws.name}`)
    return `found name="${ws.name}"`
  })

  record(results, '4. get(bogus) returns null', () => {
    const ws = manager.get('nonexistent-id')
    if (ws !== null) throw new Error('expected null')
    return 'null'
  })

  record(results, '5. update(name) emits updated event', () => {
    const before = events.length
    const updated = manager.update(createdId, { name: 'Smoke Renamed' })
    if (updated.name !== 'Smoke Renamed') throw new Error(`name: ${updated.name}`)
    const evt = events[before]
    if (evt?.type !== 'updated') throw new Error(`expected updated, got ${evt?.type}`)
    return `name="${updated.name}"`
  })

  record(results, '6. update(path→nonexistent) atomically flips needsSetup=true', () => {
    const missing = '/tmp/deck-ws-smoke-missing-' + Date.now()
    if (existsSync(missing)) rmSync(missing, { recursive: true, force: true })
    const updated = manager.update(createdId, { path: missing })
    if (updated.path !== missing) throw new Error(`path: ${updated.path}`)
    if (!updated.needsSetup) throw new Error('expected needsSetup=true')
    const row = db
      .prepare('SELECT path, needs_setup FROM workspaces WHERE id = ?')
      .get(createdId) as { path: string; needs_setup: number }
    if (row.path !== missing || row.needs_setup !== 1) {
      throw new Error(`DB not atomic: path=${row.path} needs_setup=${row.needs_setup}`)
    }
    return `path=${missing} → needsSetup=true (atomic in DB)`
  })

  record(results, '7. update(path→existing) flips needsSetup back to false', () => {
    const real = '/tmp/deck-ws-smoke-real'
    mkdirSync(real, { recursive: true })
    const updated = manager.update(createdId, { path: real })
    if (updated.needsSetup) throw new Error('expected needsSetup=false')
    rmSync(real, { recursive: true, force: true })
    return `needsSetup back to false`
  })

  record(results, '8. create() with invalid accentColor throws', () => {
    try {
      manager.create({ name: 'Bad', accentColor: 'not-hex', path: '/tmp' })
      throw new Error('expected throw')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('Invalid accentColor')) {
        throw new Error(`wrong error: ${msg}`)
      }
      return `throw: ${msg}`
    }
  })

  record(results, '9. create() with duplicate ordinal throws WorkspaceOrdinalConflictError', () => {
    try {
      manager.create({ name: 'Dup', accentColor: '#123456', path: '/tmp', ordinal: 0 })
      throw new Error('expected throw')
    } catch (err) {
      if (!(err instanceof WorkspaceOrdinalConflictError)) {
        throw new Error(`wrong error class: ${err instanceof Error ? err.message : err}`)
      }
      return `throw: ${err.message}`
    }
  })

  record(results, '10. checkPaths() detects drift bidirectionally', () => {
    const tmpReal = '/tmp/deck-ws-smoke-bi'
    mkdirSync(tmpReal, { recursive: true })
    manager.update(createdId, { path: tmpReal })
    const after1 = manager.get(createdId)!
    if (after1.needsSetup) throw new Error('pre-condition: should be false')

    rmSync(tmpReal, { recursive: true, force: true })
    const result1 = manager.checkPaths()
    const found1 = result1.changed.find((w) => w.id === createdId)
    if (!found1 || !found1.needsSetup) {
      throw new Error(
        `expected needsSetup=true after dir removed; changed=${result1.changed.length}`
      )
    }

    mkdirSync(tmpReal, { recursive: true })
    const result2 = manager.checkPaths()
    const found2 = result2.changed.find((w) => w.id === createdId)
    if (!found2 || found2.needsSetup) {
      throw new Error(`expected needsSetup=false after dir recreated`)
    }
    rmSync(tmpReal, { recursive: true, force: true })
    return `false→true (${result1.changed.length}), true→false (${result2.changed.length})`
  })

  record(results, '11. delete() removes row + emits deleted event', () => {
    const before = events.length
    manager.delete(createdId)
    const still = manager.get(createdId)
    if (still !== null) throw new Error('still exists')
    const evt = events[before]
    if (evt?.type !== 'deleted') throw new Error(`expected deleted, got ${evt?.type}`)
    if (evt.id !== createdId) throw new Error('wrong id in event')
    return `deleted, event payload id matches`
  })

  record(results, '12. delete(nonexistent) throws', () => {
    try {
      manager.delete('bogus-id')
      throw new Error('expected throw')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('not found')) throw new Error(`wrong error: ${msg}`)
      return `throw: ${msg}`
    }
  })

  record(results, '13. list() after delete returns 3 (seeded untouched)', () => {
    const list: Workspace[] = manager.list()
    if (list.length !== 3) throw new Error(`expected 3, got ${list.length}`)
    return `count=${list.length}`
  })

  db.close()

  console.log('\n=== deck workspace smoke ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} passed`)

  cleanup()
  return failed === 0 ? 0 : 1
}
