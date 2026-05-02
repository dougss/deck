import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { GitCheckoutResult, GitInfo } from '../shared/ipc'

const execFileAsync = promisify(execFile)

async function run(cwd: string, args: string[], timeout = 5000): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, timeout, maxBuffer: 256 * 1024 })
  return stdout.trim()
}

function extractError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { stderr?: string; message?: string }
    if (e.stderr?.trim()) return e.stderr.trim()
    if (e.message) return e.message
  }
  return String(err)
}

interface FetchCacheEntry {
  remoteBranches: string[]
  timestamp: number
}

export class GitManager {
  private fetchCache = new Map<string, FetchCacheEntry>()

  async getInfo(cwd: string): Promise<GitInfo> {
    if (!existsSync(join(cwd, '.git'))) {
      return { isRepo: false, currentBranch: null, head: null }
    }
    try {
      const branch = await run(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
      if (branch === 'HEAD') {
        const sha = await run(cwd, ['rev-parse', '--short', 'HEAD'])
        return { isRepo: true, currentBranch: null, head: sha }
      }
      return { isRepo: true, currentBranch: branch, head: null }
    } catch {
      return { isRepo: false, currentBranch: null, head: null }
    }
  }

  async listBranches(cwd: string): Promise<string[]> {
    try {
      const out = await run(cwd, ['branch', '--format=%(refname:short)'])
      return out.split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  async fetchRemotes(cwd: string): Promise<void> {
    const now = Date.now()
    const cacheKey = cwd
    const cached = this.fetchCache.get(cacheKey)

    // Use cache if it's less than 30 seconds old
    if (cached && now - cached.timestamp < 30 * 1000) {
      return
    }

    try {
      // Run git fetch with 5 second timeout
      await run(cwd, ['fetch', '--quiet', 'origin'], 5000)

      // Update the cache with remote branches
      const remoteBranches = await this.getRemoteBranches(cwd)
      this.fetchCache.set(cacheKey, {
        remoteBranches,
        timestamp: now
      })
    } catch {
      // If fetch fails, still set an empty entry to indicate that we tried
      // but don't store any remote branches
      this.fetchCache.set(cacheKey, {
        remoteBranches: [],
        timestamp: now
      })
    }
  }

  private async getRemoteBranches(cwd: string): Promise<string[]> {
    try {
      const out = await run(cwd, ['branch', '-r', '--format=%(refname:short)'])
      // Filter to only origin branches and clean up whitespace
      return out
        .split('\n')
        .filter(Boolean)
        .map((branch) => branch.trim())
        .filter((branch) => branch.startsWith('origin/'))
    } catch {
      return []
    }
  }

  async listBranchesWithRemotes(cwd: string): Promise<{ local: string[]; remote: string[] }> {
    // Fetch remote branches first (will use cache if recent enough)
    await this.fetchRemotes(cwd)

    // Get local branches
    const local = await this.listBranches(cwd)

    // Get remote branches from cache
    const cacheKey = cwd
    const cached = this.fetchCache.get(cacheKey)
    const remote = cached?.remoteBranches || []

    return { local, remote }
  }

  async isDirty(cwd: string): Promise<boolean> {
    try {
      const out = await run(cwd, ['status', '--porcelain'])
      return out.length > 0
    } catch {
      return false
    }
  }

  async checkout(cwd: string, branch: string): Promise<GitCheckoutResult> {
    const dirty = await this.isDirty(cwd)
    if (dirty) return { ok: false, dirty: true }
    try {
      await run(cwd, ['checkout', branch])
      return { ok: true }
    } catch (err) {
      return { ok: false, error: extractError(err) }
    }
  }

  async stashAndCheckout(cwd: string, branch: string): Promise<GitCheckoutResult> {
    try {
      await run(cwd, ['stash']).catch(() => {})
      await run(cwd, ['checkout', branch])
      return { ok: true }
    } catch (err) {
      return { ok: false, error: extractError(err) }
    }
  }
}
