import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import { parseSshConfig } from './ssh-config-parser'

export function registerSshHandlers(): void {
  ipcMain.handle(IPC.SSH_LIST_HOSTS, async () => {
    return parseSshConfig()
  })
}
