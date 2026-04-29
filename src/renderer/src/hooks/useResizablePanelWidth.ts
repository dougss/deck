import { useState, useEffect, useCallback } from 'react'

export interface UseResizablePanelWidthOptions {
  storageKey: string
  defaultWidth: number
  minWidth: number
  getMaxWidth?: () => number
}

export interface UseResizablePanelWidthResult {
  width: number
  setWidthCommitted: (w: number) => void
  resetToDefault: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function defaultGetMaxWidth(): number {
  return Math.max(200, Math.floor(window.innerWidth * 0.5))
}

function loadWidth(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  getMaxWidth: () => number
): number {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return defaultWidth
  const parsed = parseInt(stored, 10)
  if (isNaN(parsed)) return defaultWidth
  return clamp(parsed, minWidth, getMaxWidth())
}

export function useResizablePanelWidth({
  storageKey,
  defaultWidth,
  minWidth,
  getMaxWidth = defaultGetMaxWidth
}: UseResizablePanelWidthOptions): UseResizablePanelWidthResult {
  const [width, setWidth] = useState<number>(() =>
    loadWidth(storageKey, defaultWidth, minWidth, getMaxWidth)
  )

  useEffect(() => {
    function handleResize(): void {
      const max = getMaxWidth()
      setWidth((prev) => {
        const clamped = clamp(prev, minWidth, max)
        if (clamped !== prev) {
          localStorage.setItem(storageKey, String(clamped))
        }
        return clamped
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [storageKey, minWidth, getMaxWidth])

  const setWidthCommitted = useCallback(
    (w: number): void => {
      const clamped = clamp(w, minWidth, getMaxWidth())
      setWidth(clamped)
      localStorage.setItem(storageKey, String(clamped))
    },
    [storageKey, minWidth, getMaxWidth]
  )

  const resetToDefault = useCallback((): void => {
    setWidth(defaultWidth)
    localStorage.setItem(storageKey, String(defaultWidth))
  }, [storageKey, defaultWidth])

  return { width, setWidthCommitted, resetToDefault }
}
