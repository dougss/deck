import { ipcMain, type BrowserWindow } from 'electron'
import type { GitManager } from './git-manager'
import type { GitDiffManager } from './git-diff-manager'
import type { SessionManager } from './session-manager'
import {
  IPC,
  type GitCheckoutRequest,
  type GitDiffGetFileRequest,
  type GitDiffSummaryUpdatedEvent,
  type GitDiffWatchRequest,
  type GitGetInfoRequest,
  type GitInfoUpdatedEvent,
  type GitListBranchesRequest,
  type GitListBranchesWithRemotesRequest
} from '../shared/ipc'

export function registerGitHandlers(
  gitManager: GitManager,
  gitDiffManager: GitDiffManager,
  sessionManager: SessionManager,
  getWindow: () => BrowserWindow | null
): void {
  const push = (payload: GitInfoUpdatedEvent): void => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC.GIT_INFO_UPDATED, payload)
  }

  ipcMain.handle(IPC.GIT_GET_INFO, async (_event, req: GitGetInfoRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session || session.type === 'ssh')
      return { isRepo: false, currentBranch: null, head: null }
    return gitManager.getInfo(session.cwd)
  })

  ipcMain.handle(IPC.GIT_LIST_BRANCHES, async (_event, req: GitListBranchesRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session || session.type === 'ssh') return []
    return gitManager.listBranches(session.cwd)
  })

  ipcMain.handle(
    IPC.GIT_LIST_BRANCHES_WITH_REMOTES,
    async (_event, req: GitListBranchesWithRemotesRequest) => {
      const session = sessionManager.get(req.sessionId)
      if (!session || session.type === 'ssh') return { local: [], remote: [] }
      return gitManager.listBranchesWithRemotes(session.cwd)
    }
  )

  ipcMain.handle(IPC.GIT_CHECKOUT, async (_event, req: GitCheckoutRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.type === 'ssh') return { ok: false, error: 'Not applicable for SSH sessions' }
    return gitManager.checkout(session.cwd, req.branch)
  })

  ipcMain.handle(IPC.GIT_STASH_CHECKOUT, async (_event, req: GitCheckoutRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    if (session.type === 'ssh') return { ok: false, error: 'Not applicable for SSH sessions' }
    return gitManager.stashAndCheckout(session.cwd, req.branch)
  })

  // Push gitInfo immediately after PTY attach so renderer has it before header renders
  sessionManager.on('ptyAttached', ({ sessionId }) => {
    const session = sessionManager.get(sessionId)
    if (!session || session.type === 'ssh') return
    gitManager
      .getInfo(session.cwd)
      .then((gitInfo) => push({ sessionId, gitInfo }))
      .catch(() => {})
  })

  // ── Diff panel ────────────────────────────────────────────────────────────
  const pushDiff = (payload: GitDiffSummaryUpdatedEvent): void => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC.GIT_DIFF_SUMMARY_UPDATED, payload)
  }

  gitDiffManager.onSummary((cwd, summary) => {
    pushDiff({ cwd, summary })
  })

  ipcMain.handle(IPC.GIT_DIFF_WATCH_START, async (_event, req: GitDiffWatchRequest) => {
    return gitDiffManager.watchStart(req.cwd)
  })

  ipcMain.handle(IPC.GIT_DIFF_WATCH_STOP, async (_event, req: GitDiffWatchRequest) => {
    await gitDiffManager.watchStop(req.cwd)
  })

  ipcMain.handle(IPC.GIT_DIFF_REFRESH, async (_event, req: GitDiffWatchRequest) => {
    return gitDiffManager.refresh(req.cwd)
  })

  ipcMain.handle(IPC.GIT_DIFF_GET_FILE, async (_event, req: GitDiffGetFileRequest) => {
    return gitDiffManager.getFileDiff(req.cwd, req.path, req.staged)
  })
}
