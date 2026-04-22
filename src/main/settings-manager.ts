import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { DeckSettings } from '../shared/ipc'

const DEFAULT_SETTINGS: DeckSettings = {
  preferredEditor: null,
  customEditorCommand: null,
  defaultExecutorCommand: 'claude'
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): DeckSettings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function setSettings(patch: Partial<DeckSettings>): DeckSettings {
  const current = getSettings()
  const next = { ...current, ...patch }
  const p = getSettingsPath()
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8')
  fs.renameSync(tmp, p)
  return next
}
