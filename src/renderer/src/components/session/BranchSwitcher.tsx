import { useEffect, useRef, useState } from 'react'
import { useDeckStore } from '@/stores/deck'
import { useToast } from '@/components/ui/Toast'
import type { GitInfo } from '../../../../shared/ipc'

interface Props {
  sessionId: string
  gitInfo: GitInfo
  isIdle: boolean
}

const MAX_LABEL_LEN = 22

function truncate(s: string): string {
  return s.length > MAX_LABEL_LEN ? s.slice(0, MAX_LABEL_LEN - 1) + '…' : s
}

export function BranchSwitcher({ sessionId, gitInfo, isIdle }: Props): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightedItemRef = useRef<HTMLButtonElement>(null)
  const toast = useToast()
  const tick = useDeckStore((s) => s.openBranchSwitcherTick)
  const setGitInfo = useDeckStore((s) => s.setGitInfo)

  const filteredBranches = searchQuery
    ? branches.filter((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
    : branches

  // Cmd+Shift+B opens via tick
  useEffect(() => {
    if (tick === 0) return
    if (!isIdle) setIsOpen(true)
  }, [tick, isIdle])

  // Click-outside closes
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Auto-focus input on open; atomic reset on close
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else {
      setSearchQuery('')
      setHighlightIdx(-1)
    }
  }, [isOpen])

  // Initial highlight when branches load (or dropdown reopens with cached branches)
  useEffect(() => {
    if (!isOpen || branches.length === 0) return
    setHighlightIdx(branches.length > 1 ? 1 : 0)
  }, [branches, isOpen])

  // Reset highlight to top of filtered list when query changes
  useEffect(() => {
    if (!isOpen) return
    setHighlightIdx(filteredBranches.length > 0 ? 0 : -1)
  }, [searchQuery])

  // Scroll highlighted item into view without disrupting header/input visibility
  useEffect(() => {
    highlightedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [highlightIdx])

  const open = async (): Promise<void> => {
    if (isIdle) return
    setIsOpen(true)
    const list = await window.deck.git.listBranches(sessionId)
    const current = gitInfo.currentBranch
    const sorted = current ? [current, ...list.filter((b) => b !== current)] : list
    setBranches(sorted)
  }

  const checkout = async (branch: string): Promise<void> => {
    if (branch === gitInfo.currentBranch) {
      setIsOpen(false)
      return
    }
    setLoading(true)
    setIsOpen(false)
    const result = await window.deck.git.checkout(sessionId, branch)
    setLoading(false)

    if (result.dirty) {
      toast({
        type: 'confirm',
        message: `Uncommitted changes. Stash and switch to "${branch}"?`,
        actions: [
          {
            label: 'Stash & Switch',
            onClick: () => doStashAndSwitch(branch)
          },
          { label: 'Cancel', onClick: () => {} }
        ]
      })
      return
    }

    if (!result.ok) {
      toast({ type: 'error', message: `Git error: ${result.error ?? 'unknown'}` })
      return
    }

    setGitInfo(sessionId, { ...gitInfo, currentBranch: branch, head: null })
    toast({ type: 'info', message: `Switched to ${branch}` })
  }

  const doStashAndSwitch = async (branch: string): Promise<void> => {
    setLoading(true)
    const result = await window.deck.git.stashAndCheckout(sessionId, branch)
    setLoading(false)

    if (!result.ok) {
      toast({ type: 'error', message: `Git error: ${result.error ?? 'unknown'}` })
      return
    }

    setGitInfo(sessionId, { ...gitInfo, currentBranch: branch, head: null })
    toast({
      type: 'info',
      message: `Stashed and switched to ${branch}. Use git stash pop to restore.`
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.min(prev + 1, filteredBranches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (loading || filteredBranches.length === 0) return
      const idx = highlightIdx >= 0 ? highlightIdx : 0
      const target = filteredBranches[idx]
      if (!target) return
      checkout(target)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const label =
    gitInfo.currentBranch != null
      ? truncate(gitInfo.currentBranch)
      : gitInfo.head != null
        ? `@ ${gitInfo.head}`
        : '?'

  const fullLabel =
    gitInfo.currentBranch ?? (gitInfo.head != null ? `Detached HEAD @ ${gitInfo.head}` : 'Unknown')

  const isDetached = gitInfo.currentBranch === null && gitInfo.head !== null
  const dimmed = isIdle || loading

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        onClick={open}
        disabled={isIdle}
        title={
          isIdle ? 'Attach session to switch branches' : isDetached ? 'Detached HEAD' : fullLabel
        }
        className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
          dimmed
            ? 'cursor-default text-op-zinc-600'
            : 'cursor-pointer text-op-zinc-400 hover:bg-op-zinc-800 hover:text-op-zinc-200'
        }`}
      >
        {isDetached ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 text-op-zinc-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <line x1="3" y1="12" x2="9" y2="12" />
            <line x1="15" y1="12" x2="21" y2="12" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 text-op-zinc-500"
            aria-hidden="true"
          >
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        )}
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 flex min-w-[180px] max-w-[280px] flex-col rounded-lg border border-op-border bg-op-surface-3 shadow-lg"
          style={{ maxHeight: '16rem' }}
        >
          <div className="flex-shrink-0 border-b border-op-border px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search branches..."
              className="w-full bg-transparent font-mono text-[12px] text-op-zinc-200 outline-none placeholder:text-op-zinc-600"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filteredBranches.length === 0 ? (
              <div className="px-3 py-3 text-center font-mono text-[12px] text-op-zinc-500">
                {branches.length === 0 ? '' : 'No branches match'}
              </div>
            ) : (
              filteredBranches.map((b, index) => {
                const isCurrent = b === gitInfo.currentBranch
                const isHighlighted = index === highlightIdx
                return (
                  <button
                    key={b}
                    ref={isHighlighted ? highlightedItemRef : undefined}
                    onClick={() => checkout(b)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[12px] transition-colors hover:bg-op-zinc-800 ${
                      isHighlighted
                        ? 'bg-op-zinc-800 text-op-zinc-100'
                        : isCurrent
                          ? 'text-op-zinc-100'
                          : 'text-op-zinc-400'
                    }`}
                  >
                    <span className="w-3 flex-shrink-0 text-center">{isCurrent ? '●' : ''}</span>
                    <span className="truncate" title={b}>
                      {b}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
