import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { IPC } from '../shared/ipc'

export function registerDialogHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.DIALOG_PICK_FOLDER, async (): Promise<string | null> => {
    const win = getWindow()
    if (!win) return null
    const projectsPath = join(homedir(), 'Projects')
    const defaultPath = existsSync(projectsPath) ? projectsPath : homedir()
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      defaultPath,
      title: 'Select workspace folder'
    })
    if (result.canceled) return null
    return result.filePaths[0] ?? null
  })
}
