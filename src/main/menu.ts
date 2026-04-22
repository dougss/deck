import { Menu, BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc'

export function buildApplicationMenu(mainWindow: BrowserWindow): Menu {
  const send = (channel: string, ...args: unknown[]): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args)
  }

  return Menu.buildFromTemplate([
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => send(IPC.SHORTCUT_NEW_SESSION)
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Session',
      submenu: [
        {
          label: 'Stop Active Session',
          accelerator: 'CmdOrCtrl+W',
          click: () => send(IPC.SHORTCUT_STOP_SESSION)
        },
        { type: 'separator' },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
          label: `Switch to Session ${n}`,
          accelerator: `CmdOrCtrl+${n}`,
          click: () => send(IPC.SHORTCUT_SWITCH_SESSION, n)
        }))
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Search Sessions',
          accelerator: 'CmdOrCtrl+F',
          click: () => send(IPC.SHORTCUT_FOCUS_SEARCH)
        },
        {
          label: 'Toggle Panel',
          accelerator: 'CmdOrCtrl+\\',
          click: () => send(IPC.SHORTCUT_TOGGLE_PANEL)
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
        // Intentionally excludes role:'close' (⌘W) — handled by Session menu as Stop Active Session
      ]
    }
  ])
}
