import { useEffect } from 'react'
import { useDeckStore } from '../stores/deck'

export function useDeckBootstrap(): void {
  useEffect(() => {
    const dispose = useDeckStore.getState().subscribe()
    void useDeckStore.getState().hydrate()
    return dispose
  }, [])
}
