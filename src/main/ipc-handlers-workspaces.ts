import { ipcMain, type BrowserWindow } from 'electron'
import { WorkspaceManager } from './workspace-manager'
import {
  IPC,
  type Workspace,
  type WorkspaceCheckPathsResult,
  type WorkspaceCreateRequest,
  type WorkspaceDeleteRequest,
  type WorkspaceGetRequest,
  type WorkspaceUpdateRequest
} from '../shared/ipc'

export function registerWorkspaceHandlers(
  manager: WorkspaceManager,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC.WORKSPACE_LIST, (): Workspace[] => manager.list())

  ipcMain.handle(IPC.WORKSPACE_GET, (_event, req: WorkspaceGetRequest): Workspace | null =>
    manager.get(req.id)
  )

  ipcMain.handle(
    IPC.WORKSPACE_CREATE,
    (_event, req: WorkspaceCreateRequest): Workspace => manager.create(req)
  )

  ipcMain.handle(
    IPC.WORKSPACE_UPDATE,
    (_event, req: WorkspaceUpdateRequest): Workspace => manager.update(req.id, req.patch)
  )

  ipcMain.handle(IPC.WORKSPACE_DELETE, (_event, req: WorkspaceDeleteRequest): void => {
    manager.delete(req.id)
  })

  ipcMain.handle(IPC.WORKSPACE_CHECK_PATHS, (): WorkspaceCheckPathsResult => manager.checkPaths())

  manager.on('updated', (event) => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(IPC.WORKSPACE_UPDATED, event)
  })
}
