import type { SessionId } from '../../../shared/ipc'

const TOGGLE_PREFIX = 'deck:embeddedTerminal:'
const RATIO_KEY = 'deck:embeddedTerminalRatio'

export const EMBEDDED_RATIO_DEFAULT = 0.3
export const EMBEDDED_RATIO_MIN = 0.1
export const EMBEDDED_RATIO_MAX = 0.6

function clampRatio(n: number): number {
  if (!Number.isFinite(n)) return EMBEDDED_RATIO_DEFAULT
  if (n < EMBEDDED_RATIO_MIN) return EMBEDDED_RATIO_MIN
  if (n > EMBEDDED_RATIO_MAX) return EMBEDDED_RATIO_MAX
  return n
}

export function getEmbeddedToggle(sessionId: SessionId): boolean {
  try {
    return localStorage.getItem(TOGGLE_PREFIX + sessionId) === 'true'
  } catch {
    return false
  }
}

export function setEmbeddedToggle(sessionId: SessionId, on: boolean): void {
  try {
    if (on) localStorage.setItem(TOGGLE_PREFIX + sessionId, 'true')
    else localStorage.removeItem(TOGGLE_PREFIX + sessionId)
  } catch {
    // ignore storage errors
  }
}

export function clearEmbeddedToggle(sessionId: SessionId): void {
  try {
    localStorage.removeItem(TOGGLE_PREFIX + sessionId)
  } catch {
    // ignore
  }
}

export function getEmbeddedRatio(): number {
  try {
    const raw = localStorage.getItem(RATIO_KEY)
    if (raw === null) return EMBEDDED_RATIO_DEFAULT
    const parsed = Number.parseFloat(raw)
    return clampRatio(parsed)
  } catch {
    return EMBEDDED_RATIO_DEFAULT
  }
}

export function setEmbeddedRatio(ratio: number): number {
  const clamped = clampRatio(ratio)
  try {
    localStorage.setItem(RATIO_KEY, String(clamped))
  } catch {
    // ignore
  }
  return clamped
}
