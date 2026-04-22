import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import { IPC } from '../shared/ipc'
import type { OpenInEditorRequest } from '../shared/ipc'
import { getSettings } from './settings-manager'

const PRESET_BINS: Record<'zed' | 'cursor' | 'vscode', string> = {
  zed: 'zed',
  cursor: 'cursor',
  vscode: 'code'
}

export function registerSystemHandlers(): void {
  ipcMain.handle(IPC.SYSTEM_OPEN_IN_EDITOR, (_event, req: OpenInEditorRequest): void => {
    const { preferredEditor, customEditorCommand } = getSettings()
    if (!preferredEditor) return

    let bin: string
    let extraArgs: string[] = []

    if (preferredEditor === 'custom') {
      if (!customEditorCommand) return
      const parts = customEditorCommand.split(' ')
      bin = parts[0]
      extraArgs = parts.slice(1)
    } else {
      bin = PRESET_BINS[preferredEditor]
    }

    const child = spawn(bin, [...extraArgs, req.workspacePath], {
      detached: true,
      stdio: 'ignore'
    })
    child.on('error', (err) => {
      console.error(`[system] openInEditor spawn error: ${err.message}`)
    })
    child.unref()
  })
}
