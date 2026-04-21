import type { DeckApi } from '../../../../shared/ipc'

declare global {
  interface Window {
    deck: DeckApi
  }
}

export {}
