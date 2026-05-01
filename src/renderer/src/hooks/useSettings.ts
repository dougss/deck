import { useState, useEffect } from 'react'
import type { DeckSettings } from '../../../shared/ipc'

export function useSettings(): [DeckSettings | null, () => Promise<void>] {
  const [settings, setSettings] = useState<DeckSettings | null>(null)

  const refreshSettings = async (): Promise<void> => {
    const s = await window.deck.settings.get()
    setSettings(s)
  }

  useEffect(() => {
    const fetchSettings = async (): Promise<void> => {
      await refreshSettings()
    }
    void fetchSettings()
  }, [])

  return [settings, refreshSettings]
}
