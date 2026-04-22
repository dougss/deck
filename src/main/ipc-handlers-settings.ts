import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { DeckSettings } from '../shared/ipc'
import { getSettings, setSettings } from './settings-manager'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): DeckSettings => getSettings())
  ipcMain.handle(
    IPC.SETTINGS_SET,
    (_event, patch: Partial<DeckSettings>): DeckSettings => setSettings(patch)
  )
}
