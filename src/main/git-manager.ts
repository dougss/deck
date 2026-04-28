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

export class GitManager {
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
