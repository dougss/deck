import { useEffect, useRef } from 'react'
import { useDiffStore } from '@/stores/diff'
import { useSessions } from '@/stores/deck'

const POLL_INTERVAL_MS = 4000

/**
 * Subscribe to diff summaries for every local (non-SSH) session's cwd so badges
 * stay up-to-date in the sidebar even when the diff panel is closed.
 * GitDiffManager refcounts shared cwds, so opening the panel later costs nothing.
 *
 * Also runs a single 4s polling loop that refreshes every watched cwd. Working-
 * tree edits aren't captured by chokidar (we only watch .git internals to avoid
 * EMFILE / CPU burn), so this catch-all keeps every session's badge fresh.
 */
export function useDiffSubscriptions(): void {
  const sessions = useSessions()
  const subscribe = useDiffStore((s) => s.subscribe)
  const watch = useDiffStore((s) => s.watch)
  const unwatch = useDiffStore((s) => s.unwatch)
  const refresh = useDiffStore((s) => s.refresh)

  const watchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const dispose = subscribe()
    return () => dispose()
  }, [subscribe])

  useEffect(() => {
    const desired = new Set<string>()
    for (const s of sessions) {
      if (s.type === 'ssh') continue
      if (!s.cwd) continue
      desired.add(s.cwd)
    }

    // Add new
    for (const cwd of desired) {
      if (!watchedRef.current.has(cwd)) {
        watchedRef.current.add(cwd)
        void watch(cwd)
      }
    }
    // Remove gone
    for (const cwd of Array.from(watchedRef.current)) {
      if (!desired.has(cwd)) {
        watchedRef.current.delete(cwd)
        void unwatch(cwd)
      }
    }
  }, [sessions, watch, unwatch])

  useEffect(() => {
    const set = watchedRef.current
    const id = setInterval(() => {
      for (const cwd of set) {
        void refresh(cwd)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const set = watchedRef.current
    return () => {
      for (const cwd of Array.from(set)) {
        void unwatch(cwd)
      }
      set.clear()
    }
  }, [unwatch])
}
