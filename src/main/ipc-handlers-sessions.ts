import { ipcMain, type BrowserWindow } from 'electron'
import { SessionManager } from './session-manager'
import {
  IPC,
  type PtyDataEvent,
  type PtyExitEvent,
  type Session,
  type SessionAttachRequest,
  type SessionCreateRequest,
  type SessionDeleteRequest,
  type SessionDetachRequest,
  type SessionGetRequest,
  type SessionListRequest,
  type SessionUpdateRequest
} from '../shared/ipc'

export function registerSessionHandlers(
  manager: SessionManager,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC.SESSION_LIST, (_event, req: SessionListRequest | undefined): Session[] =>
    manager.list(req?.workspaceId)
  )

  ipcMain.handle(IPC.SESSION_GET, (_event, req: SessionGetRequest): Session | null =>
    manager.get(req.id)
  )

  ipcMain.handle(
    IPC.SESSION_CREATE,
    (_event, req: SessionCreateRequest): Session => manager.create(req)
  )

  ipcMain.handle(
    IPC.SESSION_UPDATE,
    (_event, req: SessionUpdateRequest): Session => manager.update(req.id, req.patch)
  )

  ipcMain.handle(IPC.SESSION_DELETE, (_event, req: SessionDeleteRequest): void => {
    manager.delete(req.id)
  })

  ipcMain.handle(
    IPC.SESSION_ATTACH,
    (_event, req: SessionAttachRequest): Session =>
      manager.attach(req.id, { cols: req.cols, rows: req.rows })
  )

  ipcMain.handle(
    IPC.SESSION_DETACH,
    (_event, req: SessionDetachRequest): Session => manager.detach(req.id)
  )

  manager.on('updated', (event) => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC.SESSION_UPDATED, event)
  })

  // Fan-out pty:data and pty:exit for PTYs spawned via session.attach.
  // registerPtyHandlers (src/main/ipc-handlers.ts) only wires these
  // listeners for PTYs spawned via the pty:spawn IPC call, so sessions
  // need their own fan-out path here. Listeners auto-GC when the
  // PtyManager instance dies.
  manager.on('ptyAttached', ({ ptyId, manager: ptyManager }) => {
    ptyManager.on('data', (chunk) => {
      const win = getWindow()
      if (!win || win.isDestroyed()) return
      const payload: PtyDataEvent = { ptyId, chunk }
      win.webContents.send(IPC.PTY_DATA, payload)
    })
    ptyManager.on('exit', (info) => {
      const win = getWindow()
      if (!win || win.isDestroyed()) return
      const payload: PtyExitEvent = { ptyId, exitCode: info.exitCode, signal: info.signal }
      win.webContents.send(IPC.PTY_EXIT, payload)
    })
  })
}
