import { execFile } from 'node:child_process'
import { existsSync, readFile } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { watch } from 'chokidar'
import type { DiffSummary, FileChange, FileChangeStatus, GitDiffFileResult } from '../shared/ipc'

const execFileAsync = promisify(execFile)
const readFileAsync = promisify(readFile)

const DEBOUNCE_MS = 300
const SUMMARY_TTL_MS = 500
const MAX_DIFF_BUFFER = 8 * 1024 * 1024 // 8MB
const TRUNCATE_LINES = 2000

export const IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/.next/**',
  '**/build/**',
  '**/.turbo/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/.DS_Store'
]

interface NumstatEntry {
  added: number
  deleted: number
  isBinary: boolean
  path: string
  oldPath?: string
}

interface PorcelainEntry {
  path: string
  oldPath?: string
  status: FileChangeStatus
  staged: boolean
}

async function runGit(cwd: string, args: string[], timeout = 5000): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    timeout,
    maxBuffer: MAX_DIFF_BUFFER
  })
  return stdout
}

async function isGitRepo(cwd: string): Promise<boolean> {
  if (!existsSync(cwd)) return false
  try {
    await runGit(cwd, ['rev-parse', '--git-dir'])
    return true
  } catch {
    return false
  }
}

async function getGitDir(cwd: string): Promise<string | null> {
  try {
    const out = (await runGit(cwd, ['rev-parse', '--git-dir'])).trim()
    if (!out) return null
    if (out.startsWith('/')) return out
    return join(cwd, out)
  } catch {
    return null
  }
}

/**
 * Parse `git status --porcelain=v2 -uall -z` output.
 * Format reference: https://git-scm.com/docs/git-status#_porcelain_format_version_2
 *
 * Records are NUL-separated. Renames have a second NUL-separated origin path.
 */
export function parsePorcelainV2(out: string): PorcelainEntry[] {
  const entries: PorcelainEntry[] = []
  if (!out) return entries

  // -z output uses NUL separator. Renames: "2 ... origPath\0newPath\0" — the orig path
  // ends after the regular fields and before a NUL, not embedded in the same record.
  // We split on NUL and walk records.
  const tokens = out.split('\0')
  let i = 0
  while (i < tokens.length) {
    const rec = tokens[i]
    if (!rec) {
      i++
      continue
    }
    const head = rec[0]
    if (head === '1') {
      // 1 XY sub mH mI mW hH hI path
      const m = rec.match(/^1 (\S\S) \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/)
      if (m) {
        const xy = m[1]
        const path = m[2]
        const x = xy[0]
        const y = xy[1]
        if (x !== '.' && x !== ' ') {
          entries.push({ path, status: mapStatusCode(x), staged: true })
        }
        if (y !== '.' && y !== ' ') {
          entries.push({ path, status: mapStatusCode(y), staged: false })
        }
      }
      i++
    } else if (head === '2') {
      // 2 XY sub mH mI mW hH hI rcScore path → next token = origPath
      const m = rec.match(/^2 (\S\S) \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/)
      const newPath = m ? m[2] : ''
      const xy = m ? m[1] : '..'
      const origPath = tokens[i + 1] ?? ''
      const x = xy[0]
      const y = xy[1]
      if (x !== '.' && x !== ' ') {
        entries.push({
          path: newPath,
          oldPath: origPath,
          status: mapStatusCode(x),
          staged: true
        })
      }
      if (y !== '.' && y !== ' ') {
        entries.push({
          path: newPath,
          oldPath: origPath,
          status: mapStatusCode(y),
          staged: false
        })
      }
      i += 2
    } else if (head === 'u') {
      // unmerged — treat as modified unstaged
      const m = rec.match(/^u \S\S \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.+)$/)
      if (m) entries.push({ path: m[1], status: 'modified', staged: false })
      i++
    } else if (head === '?') {
      // ? path
      const path = rec.slice(2)
      if (path) entries.push({ path, status: 'untracked', staged: false })
      i++
    } else {
      i++
    }
  }
  return entries
}

function mapStatusCode(code: string): FileChangeStatus {
  switch (code) {
    case 'M':
      return 'modified'
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
    case 'C':
      return 'renamed'
    case 'T':
      return 'modified'
    case '?':
      return 'untracked'
    default:
      return 'modified'
  }
}

/**
 * Parse `git diff --numstat -z` output.
 * Each record: "added\tdeleted\tpath" with renames using two NUL-separated paths.
 * Binary files: "-\t-\tpath".
 */
export function parseNumstat(out: string): NumstatEntry[] {
  const entries: NumstatEntry[] = []
  if (!out) return entries

  // -z output: records separated by NUL. Rename records: "added\tdeleted\t\0orig\0new\0".
  // We process character-by-character to handle the rename inline-NUL case.
  let i = 0
  while (i < out.length) {
    const recEnd = findNul(out, i)
    const segment = out.slice(i, recEnd)
    if (!segment) {
      i = recEnd + 1
      continue
    }
    // segment may end with "\t" (rename: path is in next 2 tokens) or contain full path.
    const parts = segment.split('\t')
    if (parts.length < 3) {
      i = recEnd + 1
      continue
    }
    const addedRaw = parts[0]
    const deletedRaw = parts[1]
    const isBinary = addedRaw === '-' && deletedRaw === '-'
    const added = isBinary ? 0 : parseInt(addedRaw, 10) || 0
    const deleted = isBinary ? 0 : parseInt(deletedRaw, 10) || 0
    const inlinePath = parts.slice(2).join('\t')
    if (inlinePath === '') {
      // rename: next two NUL-tokens are origPath, newPath
      const origEnd = findNul(out, recEnd + 1)
      const oldPath = out.slice(recEnd + 1, origEnd)
      const newEnd = findNul(out, origEnd + 1)
      const newPath = out.slice(origEnd + 1, newEnd)
      entries.push({ added, deleted, isBinary, path: newPath, oldPath })
      i = newEnd + 1
    } else {
      entries.push({ added, deleted, isBinary, path: inlinePath })
      i = recEnd + 1
    }
  }
  return entries
}

function findNul(s: string, from: number): number {
  const idx = s.indexOf('\0', from)
  return idx === -1 ? s.length : idx
}

/**
 * Merge porcelain status entries with numstat data into a single FileChange list.
 * Same path may appear staged + unstaged — we collapse into one FileChange whose
 * `staged` flag reflects whether the file has any staged change.
 */
export function mergeFileChanges(
  porcelain: PorcelainEntry[],
  unstagedNumstat: NumstatEntry[],
  stagedNumstat: NumstatEntry[]
): FileChange[] {
  const numstatMap = new Map<string, NumstatEntry>()
  for (const e of unstagedNumstat) {
    const cur = numstatMap.get(e.path)
    numstatMap.set(e.path, {
      added: (cur?.added ?? 0) + e.added,
      deleted: (cur?.deleted ?? 0) + e.deleted,
      isBinary: e.isBinary || (cur?.isBinary ?? false),
      path: e.path,
      oldPath: e.oldPath ?? cur?.oldPath
    })
  }
  for (const e of stagedNumstat) {
    const cur = numstatMap.get(e.path)
    numstatMap.set(e.path, {
      added: (cur?.added ?? 0) + e.added,
      deleted: (cur?.deleted ?? 0) + e.deleted,
      isBinary: e.isBinary || (cur?.isBinary ?? false),
      path: e.path,
      oldPath: e.oldPath ?? cur?.oldPath
    })
  }

  const byPath = new Map<string, FileChange>()
  for (const p of porcelain) {
    const existing = byPath.get(p.path)
    const numstat = numstatMap.get(p.path)
    const fc: FileChange = existing ?? {
      path: p.path,
      oldPath: p.oldPath,
      status: p.status,
      staged: p.staged,
      added: numstat?.added ?? 0,
      deleted: numstat?.deleted ?? 0,
      isBinary: numstat?.isBinary ?? false
    }
    if (existing) {
      // collapse: prefer non-untracked status; staged=true if either side is staged
      if (existing.status === 'untracked' && p.status !== 'untracked') {
        existing.status = p.status
      }
      if (p.staged) existing.staged = true
      if (p.oldPath && !existing.oldPath) existing.oldPath = p.oldPath
    } else {
      byPath.set(p.path, fc)
    }
  }
  return Array.from(byPath.values())
}

interface WatcherEntry {
  close: (() => Promise<void>) | null
  refCount: number
  lastSummary: DiffSummary | null
  lastSummaryAt: number
  debounceTimer: NodeJS.Timeout | null
  inflight: Promise<DiffSummary> | null
}

export type DiffSummaryListener = (cwd: string, summary: DiffSummary) => void

export class GitDiffManager {
  private entries = new Map<string, WatcherEntry>()
  private listeners = new Set<DiffSummaryListener>()

  onSummary(listener: DiffSummaryListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async watchStart(cwd: string): Promise<DiffSummary> {
    let entry = this.entries.get(cwd)
    if (!entry) {
      entry = {
        close: null,
        refCount: 0,
        lastSummary: null,
        lastSummaryAt: 0,
        debounceTimer: null,
        inflight: null
      }
      this.entries.set(cwd, entry)
    }
    entry.refCount += 1

    if (!entry.close) {
      const gitDir = await getGitDir(cwd)
      // Watch only git internals (index/HEAD) — cheap, no fds explosion, no CPU
      // burn. Stage / commit / checkout fire instantly. Pure working-tree edits
      // require either a) the user clicking refresh, or b) the periodic poll
      // tied to the active panel (see `pollIntervalMs`).
      const watchTargets: string[] = []
      if (gitDir) {
        watchTargets.push(join(gitDir, 'index'), join(gitDir, 'HEAD'))
      }
      const trigger = (): void => this.scheduleRefresh(cwd)

      let gitWatcherClose: (() => Promise<void>) | null = null
      if (watchTargets.length > 0) {
        const gitWatcher = watch(watchTargets, {
          ignoreInitial: true,
          persistent: true,
          usePolling: false,
          awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 50 }
        })
        gitWatcher.on('all', trigger)
        gitWatcher.on('error', () => {})
        gitWatcherClose = () => gitWatcher.close()
      }

      entry.close = async () => {
        if (gitWatcherClose) await gitWatcherClose().catch(() => {})
      }
    }

    return this.computeSummary(cwd)
  }

  async watchStop(cwd: string): Promise<void> {
    const entry = this.entries.get(cwd)
    if (!entry) return
    entry.refCount -= 1
    if (entry.refCount > 0) return
    if (entry.debounceTimer) clearTimeout(entry.debounceTimer)
    if (entry.close) {
      await entry.close().catch(() => {})
    }
    this.entries.delete(cwd)
  }

  async refresh(cwd: string): Promise<DiffSummary> {
    return this.computeSummary(cwd, true)
  }

  refCount(cwd: string): number {
    return this.entries.get(cwd)?.refCount ?? 0
  }

  private scheduleRefresh(cwd: string): void {
    const entry = this.entries.get(cwd)
    if (!entry) return
    if (entry.debounceTimer) clearTimeout(entry.debounceTimer)
    entry.debounceTimer = setTimeout(() => {
      entry.debounceTimer = null
      this.computeSummary(cwd, true)
        .then((summary) => {
          for (const l of this.listeners) {
            try {
              l(cwd, summary)
            } catch {
              // ignore listener errors
            }
          }
        })
        .catch(() => {})
    }, DEBOUNCE_MS)
  }

  private async computeSummary(cwd: string, force = false): Promise<DiffSummary> {
    const entry = this.entries.get(cwd)
    const now = Date.now()
    if (!force && entry?.lastSummary && now - entry.lastSummaryAt < SUMMARY_TTL_MS) {
      return entry.lastSummary
    }
    if (entry?.inflight && !force) return entry.inflight

    const promise = this.doComputeSummary(cwd)
    if (entry) entry.inflight = promise
    try {
      const summary = await promise
      if (entry) {
        entry.lastSummary = summary
        entry.lastSummaryAt = Date.now()
        entry.inflight = null
      }
      return summary
    } catch (err) {
      if (entry) entry.inflight = null
      throw err
    }
  }

  private async doComputeSummary(cwd: string): Promise<DiffSummary> {
    const isRepo = await isGitRepo(cwd)
    if (!isRepo) {
      return {
        cwd,
        isRepo: false,
        files: [],
        totals: { added: 0, deleted: 0, files: 0 }
      }
    }

    const [statusOut, unstagedOut, stagedOut] = await Promise.all([
      runGit(cwd, ['status', '--porcelain=v2', '-uall', '-z']).catch(() => ''),
      runGit(cwd, ['diff', '--numstat', '-z', 'HEAD']).catch(() => ''),
      runGit(cwd, ['diff', '--numstat', '-z', '--cached']).catch(() => '')
    ])

    const porcelain = parsePorcelainV2(statusOut)
    const unstaged = parseNumstat(unstagedOut)
    const staged = parseNumstat(stagedOut)
    const files = mergeFileChanges(porcelain, unstaged, staged)

    const totals = files.reduce(
      (acc, f) => ({
        added: acc.added + f.added,
        deleted: acc.deleted + f.deleted,
        files: acc.files + 1
      }),
      { added: 0, deleted: 0, files: 0 }
    )

    return { cwd, isRepo: true, files, totals }
  }

  async getFileDiff(cwd: string, path: string, staged: boolean): Promise<GitDiffFileResult> {
    const result: GitDiffFileResult = {
      path,
      oldContent: null,
      newContent: null,
      isBinary: false,
      truncated: false
    }
    if (!(await isGitRepo(cwd))) return result

    // Detect binary via numstat for HEAD baseline.
    try {
      const numstatOut = await runGit(cwd, ['diff', '--numstat', '-z', 'HEAD', '--', path]).catch(
        () => ''
      )
      const entries = parseNumstat(numstatOut)
      if (entries.some((e) => e.isBinary)) {
        result.isBinary = true
        return result
      }
    } catch {
      // ignore
    }

    // oldContent: HEAD revision (or staged index if staged-only view requested)
    if (staged) {
      result.oldContent = await readGitObject(cwd, `HEAD:${path}`)
      result.newContent = await readGitObject(cwd, `:${path}`)
    } else {
      result.oldContent = await readGitObject(cwd, `HEAD:${path}`)
      const fsContent = await readWorkingCopy(cwd, path)
      result.newContent = fsContent
    }

    // Truncation: if either side exceeds TRUNCATE_LINES, mark truncated.
    const oldLines = result.oldContent?.split('\n').length ?? 0
    const newLines = result.newContent?.split('\n').length ?? 0
    if (oldLines > TRUNCATE_LINES || newLines > TRUNCATE_LINES) {
      result.truncated = true
    }

    return result
  }

  async dispose(): Promise<void> {
    const entries = Array.from(this.entries.values())
    for (const e of entries) {
      if (e.debounceTimer) clearTimeout(e.debounceTimer)
      if (e.close) await e.close().catch(() => {})
    }
    this.entries.clear()
    this.listeners.clear()
  }
}

async function readGitObject(cwd: string, ref: string): Promise<string | null> {
  try {
    return await runGit(cwd, ['show', ref], 5000)
  } catch {
    return null
  }
}

async function readWorkingCopy(cwd: string, path: string): Promise<string | null> {
  try {
    const buf = await readFileAsync(join(cwd, path))
    return buf.toString('utf8')
  } catch {
    return null
  }
}
