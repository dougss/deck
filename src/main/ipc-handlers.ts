import { ipcMain, type BrowserWindow } from 'electron'
import { PtyRegistry } from './pty-registry'
import {
  IPC,
  type PtyDataEvent,
  type PtyExitEvent,
  type PtyKillRequest,
  type PtyResizeRequest,
  type PtySpawnRequest,
  type PtySpawnResponse,
  type PtyWriteRequest
} from '../shared/ipc'

export function registerPtyHandlers(
  registry: PtyRegistry,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC.PTY_SPAWN, (_event, req: PtySpawnRequest): PtySpawnResponse => {
    const shell = req.shell ?? '/bin/zsh'
    let args: string[]
    if (req.args) {
      args = req.args
    } else if (req.command) {
      args = ['-ilc', req.command]
    } else {
      args = ['-il']
    }

    const { id, manager } = registry.create({
      cwd: req.cwd,
      cols: req.cols,
      rows: req.rows,
      shell,
      args
    })

    manager.on('data', (chunk) => {
      const win = getWindow()
      if (!win || win.isDestroyed()) return
      const payload: PtyDataEvent = { ptyId: id, chunk }
      win.webContents.send(IPC.PTY_DATA, payload)
    })

    manager.on('exit', (info) => {
      const win = getWindow()
      if (!win || win.isDestroyed()) return
      const payload: PtyExitEvent = { ptyId: id, exitCode: info.exitCode, signal: info.signal }
      win.webContents.send(IPC.PTY_EXIT, payload)
    })

    return { ptyId: id, pid: manager.pid }
  })

  ipcMain.on(IPC.PTY_WRITE, (_event, req: PtyWriteRequest) => {
    registry.get(req.ptyId)?.write(req.data)
  })

  ipcMain.on(IPC.PTY_RESIZE, (_event, req: PtyResizeRequest) => {
    registry.get(req.ptyId)?.resize(req.cols, req.rows)
  })

  ipcMain.on(IPC.PTY_KILL, (_event, req: PtyKillRequest) => {
    registry.get(req.ptyId)?.kill()
  })
}
