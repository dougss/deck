import { useEffect, useRef, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { useDeckStore } from '@/stores/deck'
import { usePaletteActions } from '@/hooks/usePaletteActions'
import type { PaletteAction, PaletteCategory } from '@/hooks/usePaletteActions'

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  sessions: 'Sessions',
  workspaces: 'Workspaces',
  git: 'Git',
  settings: 'Settings'
}

const CATEGORY_ORDER: PaletteCategory[] = ['sessions', 'workspaces', 'git', 'settings']

interface GroupedActions {
  category: PaletteCategory
  actions: PaletteAction[]
}

function groupActions(actions: PaletteAction[]): GroupedActions[] {
  return CATEGORY_ORDER.flatMap((cat) => {
    const catActions = actions.filter((a) => a.category === cat)
    return catActions.length > 0 ? [{ category: cat, actions: catActions }] : []
  })
}

function filterActions(actions: PaletteAction[], query: string): PaletteAction[] {
  if (!query.trim()) return actions
  const q = query.toLowerCase()
  return actions.filter((a) => a.label.toLowerCase().includes(q))
}

export function CommandPalette(): React.JSX.Element | null {
  const isOpen = useDeckStore((s) => s.isPaletteOpen)
  const closePalette = useDeckStore((s) => s.closePalette)
  const allActions = usePaletteActions()

  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const filtered = filterActions(allActions, query)
  const groups = groupActions(filtered)

  // Scroll highlighted item into view when index changes via keyboard
  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setQuery(e.target.value)
    setHighlightedIndex(0)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = filtered[highlightedIndex]
      if (action) action.handler()
    }
  }

  if (!isOpen) return null

  let flatIndex = 0

  return (
    <RadixDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closePalette()
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150" />
        <RadixDialog.Content
          className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-[600px] max-w-[calc(100vw-32px)] bg-op-surface-2 border border-op-border rounded-xl shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            setQuery('')
            setHighlightedIndex(0)
            inputRef.current?.focus()
          }}
        >
          <RadixDialog.Title className="sr-only">Command Palette</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            Search and run commands
          </RadixDialog.Description>

          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-op-border">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 text-op-zinc-500"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search commands…"
              className="flex-1 bg-transparent font-body text-[14px] text-op-zinc-100 placeholder:text-op-zinc-500 outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-op-zinc-700 bg-op-zinc-800 px-1.5 font-mono text-[10px] text-op-zinc-400">
              esc
            </kbd>
          </div>

          {/* Action list */}
          <div className="overflow-y-auto max-h-[50vh] py-1.5">
            {groups.length === 0 ? (
              <p className="px-4 py-6 text-center font-body text-[13px] text-op-zinc-500">
                No matching commands
              </p>
            ) : (
              groups.map(({ category, actions }) => (
                <div key={category}>
                  <p className="px-3 pt-3 pb-1 font-body text-[10px] font-semibold tracking-[0.1em] uppercase text-op-zinc-500">
                    {CATEGORY_LABELS[category]}
                  </p>
                  {actions.map((action) => {
                    const idx = flatIndex++
                    const isHighlighted = idx === highlightedIndex
                    return (
                      <button
                        key={action.id}
                        ref={(el) => {
                          itemRefs.current[idx] = el
                        }}
                        type="button"
                        onClick={() => action.handler()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={[
                          'w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-75',
                          isHighlighted
                            ? 'bg-op-zinc-800 text-op-zinc-100'
                            : 'text-op-zinc-300 hover:bg-op-zinc-800 hover:text-op-zinc-100'
                        ].join(' ')}
                      >
                        <span className="font-body text-[13px] truncate">{action.label}</span>
                        {action.keyboardHint && (
                          <span className="flex-shrink-0 font-mono text-[11px] text-op-zinc-500">
                            {action.keyboardHint}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 px-4 h-8 border-t border-op-border">
            <span className="font-body text-[11px] text-op-zinc-600">
              <span className="font-mono">↑↓</span> navigate
              <span className="mx-2">·</span>
              <span className="font-mono">↵</span> select
              <span className="mx-2">·</span>
              <span className="font-mono">esc</span> close
            </span>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
