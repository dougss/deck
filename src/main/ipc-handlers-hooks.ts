import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { HookInstanceStatus } from '../shared/ipc'
import { getStatus, installHooks, uninstallHooks } from './hook-installer'

export function registerHookHandlers(): void {
  ipcMain.handle(IPC.HOOKS_GET_STATUS, (_event, instancePaths?: string[]): HookInstanceStatus[] =>
    getStatus(instancePaths)
  )

  ipcMain.handle(IPC.HOOKS_INSTALL, (_event, instancePaths?: string[]): HookInstanceStatus[] =>
    installHooks(instancePaths)
  )

  ipcMain.handle(IPC.HOOKS_UNINSTALL, (_event, instancePaths?: string[]): HookInstanceStatus[] =>
    uninstallHooks(instancePaths)
  )
}
