import { useState, useEffect } from 'react'
import type { DeckSettings } from '../../../shared/ipc'

export function useSettings(): DeckSettings | null {
  const [settings, setSettings] = useState<DeckSettings | null>(null)

  useEffect(() => {
    async function fetchSettings(): Promise<void> {
      try {
        const s = await window.deck.settings.get()
        setSettings(s)
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        setSettings(null)
      }
    }

    void fetchSettings()
  }, [])

  return settings
}
