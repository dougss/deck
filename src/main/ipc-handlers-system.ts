import { ipcMain, shell } from 'electron'
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
  ipcMain.handle(IPC.SYSTEM_OPEN_EXTERNAL, (_event, url: string): Promise<void> => {
    return shell.openExternal(url)
  })

  ipcMain.handle(IPC.SYSTEM_OPEN_IN_EDITOR, (_event, req: OpenInEditorRequest): void => {
    const { preferredEditor, customEditorCommand } = getSettings()
    if (!preferredEditor) return

    let command: string

    const escapedPath = req.workspacePath.replace(/"/g, '\\"')

    if (preferredEditor === 'custom') {
      if (!customEditorCommand) return
      if (/[;&|$><`]/.test(customEditorCommand)) {
        console.error('[system] openInEditor: custom command contains forbidden characters')
        return
      }
      command = `${customEditorCommand} "${escapedPath}"`
    } else if (preferredEditor === 'fork') {
      command = `open -a Fork "${escapedPath}"`
    } else {
      const bin = PRESET_BINS[preferredEditor as 'zed' | 'cursor' | 'vscode']
      command = `${bin} "${escapedPath}"`
    }

    // Use login shell so Finder-launched app inherits full user PATH
    const child = spawn('/bin/zsh', ['-ilc', command], {
      detached: true,
      stdio: 'ignore'
    })
    child.on('error', (err) => {
      console.error(`[system] openInEditor spawn error: ${err.message}`)
    })
    child.unref()
  })
}
