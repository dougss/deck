import { ipcMain, type BrowserWindow } from 'electron'
import type { GitManager } from './git-manager'
import type { SessionManager } from './session-manager'
import {
  IPC,
  type GitCheckoutRequest,
  type GitGetInfoRequest,
  type GitInfoUpdatedEvent,
  type GitListBranchesRequest
} from '../shared/ipc'

export function registerGitHandlers(
  gitManager: GitManager,
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
    if (!session) return { isRepo: false, currentBranch: null, head: null }
    return gitManager.getInfo(session.cwd)
  })

  ipcMain.handle(IPC.GIT_LIST_BRANCHES, async (_event, req: GitListBranchesRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session) return []
    return gitManager.listBranches(session.cwd)
  })

  ipcMain.handle(IPC.GIT_CHECKOUT, async (_event, req: GitCheckoutRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    return gitManager.checkout(session.cwd, req.branch)
  })

  ipcMain.handle(IPC.GIT_STASH_CHECKOUT, async (_event, req: GitCheckoutRequest) => {
    const session = sessionManager.get(req.sessionId)
    if (!session) return { ok: false, error: 'Session not found' }
    return gitManager.stashAndCheckout(session.cwd, req.branch)
  })

  // Push gitInfo immediately after PTY attach so renderer has it before header renders
  sessionManager.on('ptyAttached', ({ sessionId }) => {
    const session = sessionManager.get(sessionId)
    if (!session) return
    gitManager
      .getInfo(session.cwd)
      .then((gitInfo) => push({ sessionId, gitInfo }))
      .catch(() => {})
  })
}
