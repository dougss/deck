import { existsSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initDatabase } from './db'
import { PtyRegistry } from './pty-registry'
import {
  SessionAlreadyAttachedError,
  SessionManager,
  SessionNotFoundError
} from './session-manager'
import { WorkspaceManager } from './workspace-manager'
import type { PtyId, SessionUpdateEvent } from '../shared/ipc'

interface TestResult {
  name: string
  ok: boolean
  detail?: string
}

const SMOKE_DB = '/tmp/deck-session-smoke.db'

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = SMOKE_DB + ext
    if (existsSync(p)) rmSync(p)
  }
}

function record(
  results: TestResult[],
  name: string,
  fn: () => string | void | Promise<string | void>
): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then((detail) => {
      results.push({ name, ok: true, detail: detail ?? undefined })
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ name, ok: false, detail: msg })
    })
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitFor(predicate: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout: ${label}`)
    await wait(20)
  }
}

export async function runSessionSmoke(): Promise<number> {
  cleanup()
  const results: TestResult[] = []

  const { db } = initDatabase(SMOKE_DB)
  const workspaceManager = new WorkspaceManager(db)
  const registry = new PtyRegistry()
  const manager = new SessionManager(db, registry)

  const events: SessionUpdateEvent[] = []
  manager.on('updated', (e) => events.push(e))

  const ptyAttachedSeen: Array<{ sessionId: string; ptyId: PtyId }> = []
  const collectedData = new Map<PtyId, string>()
  manager.on('ptyAttached', ({ sessionId, ptyId, manager: ptyManager }) => {
    ptyAttachedSeen.push({ sessionId, ptyId })
    ptyManager.on('data', (chunk) => {
      collectedData.set(ptyId, (collectedData.get(ptyId) ?? '') + chunk)
    })
  })

  const workspaces = workspaceManager.list()
  if (workspaces.length < 1) {
    console.error('[session smoke] no seeded workspaces found — aborting')
    return 1
  }
  const wsPrimary = workspaces[0]
  const wsSecondary = workspaces[1] ?? workspaces[0]

  await record(results, '1. list() returns [] (no seeded sessions)', () => {
    const list = manager.list()
    if (list.length !== 0) throw new Error(`expected 0, got ${list.length}`)
    return `count=0`
  })

  let createdId = ''
  await record(results, '2. create() inserts + emits created event', () => {
    const before = events.length
    const s = manager.create({
      workspaceId: wsPrimary.id,
      name: 'Smoke Session',
      cwd: '/tmp',
      command: 'echo smoke-A && sleep 0.3'
    })
    createdId = s.id
    if (s.status !== 'idle') throw new Error(`expected idle, got ${s.status}`)
    if (s.ptyId !== null) throw new Error(`expected ptyId=null, got ${s.ptyId}`)
    if (s.subText !== '') throw new Error(`expected empty subText, got "${s.subText}"`)
    const evt = events[before]
    if (evt?.type !== 'created') throw new Error(`expected created, got ${evt?.type}`)
    return `id=${s.id.slice(0, 8)}…`
  })

  await record(results, '3. get(id) returns session; get(bogus) returns null', () => {
    const ok = manager.get(createdId)
    if (!ok) throw new Error('not found by id')
    const miss = manager.get('nonexistent')
    if (miss !== null) throw new Error('expected null for bogus id')
    return `get ok, get(bogus)=null`
  })

  await record(results, '4. list(workspaceId) filters correctly', () => {
    manager.create({
      workspaceId: wsSecondary.id,
      name: 'Other WS Session',
      cwd: '/tmp',
      command: 'true'
    })
    const primary = manager.list(wsPrimary.id)
    const secondary = manager.list(wsSecondary.id)
    const all = manager.list()
    if (primary.length !== 1) throw new Error(`expected 1 primary, got ${primary.length}`)
    if (secondary.length < 1) throw new Error(`expected >=1 secondary, got ${secondary.length}`)
    if (all.length < 2) throw new Error(`expected >=2 total, got ${all.length}`)
    return `primary=${primary.length} secondary=${secondary.length} all=${all.length}`
  })

  await record(results, '5. update({ name, subText }) emits updated event', () => {
    const before = events.length
    const s = manager.update(createdId, { name: 'Renamed', subText: 'working on refactor' })
    if (s.name !== 'Renamed') throw new Error(`name: ${s.name}`)
    if (s.subText !== 'working on refactor') throw new Error(`subText: ${s.subText}`)
    const evt = events[before]
    if (evt?.type !== 'updated') throw new Error(`expected updated, got ${evt?.type}`)
    return `name="${s.name}"`
  })

  await record(results, '6. update({ status }) throws (not patchable)', () => {
    try {
      manager.update(createdId, { status: 'working' } as unknown as Record<string, never>)
      throw new Error('expected throw')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('not patchable')) throw new Error(`wrong error: ${msg}`)
      return `throw: ${msg}`
    }
  })

  let ptyIdAttached: PtyId = ''
  await record(
    results,
    '7. attach() spawns PTY, status=working, ptyId set, data received',
    async () => {
      const beforeEvts = events.length
      const s = manager.attach(createdId)
      if (s.status !== 'working') throw new Error(`expected working, got ${s.status}`)
      if (!s.ptyId) throw new Error('expected ptyId set')
      ptyIdAttached = s.ptyId
      const evt = events[beforeEvts]
      if (evt?.type !== 'updated') throw new Error(`expected updated event`)
      if (!ptyAttachedSeen.find((p) => p.ptyId === ptyIdAttached)) {
        throw new Error('ptyAttached event not seen')
      }
      await waitFor(
        () => (collectedData.get(ptyIdAttached) ?? '').includes('smoke-A'),
        3000,
        'data "smoke-A" to arrive'
      )
      return `ptyId=${ptyIdAttached.slice(0, 8)}… data ok`
    }
  )

  await record(results, '8. attach() twice on same id throws SessionAlreadyAttached', () => {
    try {
      manager.attach(createdId)
      throw new Error('expected throw')
    } catch (err) {
      if (!(err instanceof SessionAlreadyAttachedError)) {
        throw new Error(`wrong error class: ${err instanceof Error ? err.message : err}`)
      }
      return `throw: ${err.message}`
    }
  })

  await record(
    results,
    '9. natural PTY death flips status back to idle + emits updated',
    async () => {
      await waitFor(
        () => {
          const s = manager.get(createdId)
          return s?.status === 'idle' && s.ptyId === null
        },
        4000,
        'status flip back to idle after natural exit'
      )
      const s = manager.get(createdId)!
      if (s.status !== 'idle') throw new Error(`status: ${s.status}`)
      if (s.ptyId !== null) throw new Error(`ptyId: ${s.ptyId}`)
      return `status=idle, ptyId=null`
    }
  )

  let createdId2 = ''
  await record(results, '10. attach + explicit detach → status idle, updated emitted', async () => {
    const created = manager.create({
      workspaceId: wsPrimary.id,
      name: 'Long Session',
      cwd: '/tmp',
      command: 'sleep 10'
    })
    createdId2 = created.id

    const attached = manager.attach(createdId2)
    if (attached.status !== 'working') throw new Error(`pre: status=${attached.status}`)
    if (!attached.ptyId) throw new Error('pre: no ptyId')

    const beforeEvts = events.length
    const detached = manager.detach(createdId2)
    if (detached.status !== 'idle') throw new Error(`post: status=${detached.status}`)
    if (detached.ptyId !== null) throw new Error(`post: ptyId=${detached.ptyId}`)
    const evt = events[beforeEvts]
    if (evt?.type !== 'updated') throw new Error(`expected updated, got ${evt?.type}`)
    return `detach ok`
  })

  await record(results, '11. delete() while attached → auto-detach + deleted event', async () => {
    const created = manager.create({
      workspaceId: wsPrimary.id,
      name: 'To Delete',
      cwd: '/tmp',
      command: 'sleep 10'
    })
    manager.attach(created.id)
    const beforeEvts = events.length
    manager.delete(created.id)
    const stillThere = manager.get(created.id)
    if (stillThere !== null) throw new Error('row still exists after delete')

    const hasUpdated = events
      .slice(beforeEvts)
      .some((e) => e.type === 'updated' && 'session' in e && e.session.id === created.id)
    const hasDeleted = events
      .slice(beforeEvts)
      .some((e) => e.type === 'deleted' && e.id === created.id)
    if (!hasUpdated) throw new Error('expected updated event (from auto-detach)')
    if (!hasDeleted) throw new Error('expected deleted event')
    return `auto-detach + delete ok`
  })

  await record(results, '12. delete(bogus) throws SessionNotFoundError', () => {
    try {
      manager.delete('bogus-id')
      throw new Error('expected throw')
    } catch (err) {
      if (!(err instanceof SessionNotFoundError)) {
        throw new Error(`wrong error class: ${err instanceof Error ? err.message : err}`)
      }
      return `throw: ${err.message}`
    }
  })

  await record(results, '13. boot recovery: stale "working" reset to "idle" in new manager', () => {
    const created = manager.create({
      workspaceId: wsPrimary.id,
      name: 'Stale',
      cwd: '/tmp',
      command: 'true'
    })
    db.prepare(`UPDATE sessions SET status = 'working' WHERE id = ?`).run(created.id)
    const peek = db
      .prepare<[string], { status: string }>(`SELECT status FROM sessions WHERE id = ?`)
      .get(created.id)
    if (peek?.status !== 'working') throw new Error('precondition failed')

    const freshRegistry = new PtyRegistry()
    const freshManager = new SessionManager(db, freshRegistry)
    const after = freshManager.get(created.id)!
    if (after.status !== 'idle') throw new Error(`expected idle, got ${after.status}`)
    return `stale working → idle on boot`
  })

  await record(
    results,
    '14. cascade workspace delete with attached session kills PTY cleanly',
    async () => {
      const wsId = randomUUID()
      const now = Date.now()
      db.prepare(
        `INSERT INTO workspaces (id, name, accent_color, path, needs_setup, ordinal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(wsId, 'Cascade WS', '#ffffff', '/tmp', 0, 99, now)

      const sessA = manager.create({
        workspaceId: wsId,
        name: 'Cascade A',
        cwd: '/tmp',
        command: 'sleep 10'
      })
      const sessB = manager.create({
        workspaceId: wsId,
        name: 'Cascade B',
        cwd: '/tmp',
        command: 'sleep 10'
      })
      const attA = manager.attach(sessA.id)
      const attB = manager.attach(sessB.id)
      if (!attA.ptyId || !attB.ptyId) throw new Error('attach pre: no ptyId')

      // Simulate ipc-handlers-workspaces orchestration.
      manager.detachAllInWorkspace(wsId)
      workspaceManager.delete(wsId)

      await wait(50)

      if (manager.get(sessA.id) !== null) throw new Error('sessA row still present')
      if (manager.get(sessB.id) !== null) throw new Error('sessB row still present')

      // Registry should no longer have either pty (kill triggered exit → registry auto-deletes).
      await waitFor(
        () => registry.get(attA.ptyId!) === undefined && registry.get(attB.ptyId!) === undefined,
        2000,
        'registry to drop cascaded ptys'
      )
      return `2 sessions + 2 PTYs cleaned up atomically`
    }
  )

  db.close()

  console.log('\n=== deck session smoke ===')
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} passed`)

  cleanup()
  return failed === 0 ? 0 : 1
}
