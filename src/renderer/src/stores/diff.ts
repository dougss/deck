import { create } from 'zustand'
import type { DiffSummary } from '../../../shared/ipc'

type SummaryMap = Record<string, DiffSummary>
type RefCountMap = Record<string, number>

interface DiffState {
  summaries: SummaryMap
  refCounts: RefCountMap
  selectedFile: Record<string, string | null>
  subscribed: boolean

  subscribe: () => () => void
  watch: (cwd: string) => Promise<void>
  unwatch: (cwd: string) => Promise<void>
  refresh: (cwd: string) => Promise<void>
  selectFile: (cwd: string, path: string | null) => void
}

let unsubscribeRef: (() => void) | null = null

export const useDiffStore = create<DiffState>()((set, get) => ({
  summaries: {},
  refCounts: {},
  selectedFile: {},
  subscribed: false,

  subscribe: () => {
    if (unsubscribeRef) return unsubscribeRef
    const dispose = window.deck.gitDiff.onSummaryUpdated((event) => {
      set((s) => ({
        summaries: { ...s.summaries, [event.cwd]: event.summary }
      }))
    })
    unsubscribeRef = () => {
      dispose()
      unsubscribeRef = null
    }
    set({ subscribed: true })
    return unsubscribeRef
  },

  watch: async (cwd: string): Promise<void> => {
    const cur = get().refCounts[cwd] ?? 0
    set((s) => ({ refCounts: { ...s.refCounts, [cwd]: cur + 1 } }))
    try {
      const summary = await window.deck.gitDiff.watchStart(cwd)
      set((s) => ({ summaries: { ...s.summaries, [cwd]: summary } }))
    } catch (err) {
      console.error('[diff store] watchStart failed:', err)
    }
  },

  unwatch: async (cwd: string): Promise<void> => {
    const cur = get().refCounts[cwd] ?? 0
    if (cur <= 0) return
    const next = cur - 1
    set((s) => {
      const refs = { ...s.refCounts }
      if (next <= 0) delete refs[cwd]
      else refs[cwd] = next
      return { refCounts: refs }
    })
    try {
      await window.deck.gitDiff.watchStop(cwd)
    } catch (err) {
      console.error('[diff store] watchStop failed:', err)
    }
  },

  refresh: async (cwd: string): Promise<void> => {
    try {
      const summary = await window.deck.gitDiff.refresh(cwd)
      set((s) => ({ summaries: { ...s.summaries, [cwd]: summary } }))
    } catch (err) {
      console.error('[diff store] refresh failed:', err)
    }
  },

  selectFile: (cwd: string, path: string | null) =>
    set((s) => ({ selectedFile: { ...s.selectedFile, [cwd]: path } }))
}))

export const useDiffSummary = (cwd: string | null): DiffSummary | null =>
  useDiffStore((s) => (cwd ? (s.summaries[cwd] ?? null) : null))

export const useSelectedDiffFile = (cwd: string | null): string | null =>
  useDiffStore((s) => (cwd ? (s.selectedFile[cwd] ?? null) : null))
