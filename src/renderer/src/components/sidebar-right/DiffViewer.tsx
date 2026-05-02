import { useEffect, useState } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import type { FileChange, GitDiffFileResult } from '../../../../shared/ipc'

interface DiffViewerProps {
  cwd: string
  file: FileChange
}

const TRUNCATE_LINES = 2000

const diffStyles = {
  variables: {
    dark: {
      diffViewerBackground: 'transparent',
      diffViewerColor: 'var(--op-zinc-200, #e4e4e7)',
      addedBackground: 'rgba(16,185,129,0.10)',
      addedColor: '#a7f3d0',
      removedBackground: 'rgba(244,63,94,0.10)',
      removedColor: '#fecdd3',
      wordAddedBackground: 'rgba(16,185,129,0.30)',
      wordRemovedBackground: 'rgba(244,63,94,0.30)',
      addedGutterBackground: 'rgba(16,185,129,0.18)',
      removedGutterBackground: 'rgba(244,63,94,0.18)',
      gutterBackground: 'transparent',
      gutterBackgroundDark: 'transparent',
      highlightBackground: 'rgba(255,255,255,0.04)',
      highlightGutterBackground: 'rgba(255,255,255,0.06)',
      codeFoldGutterBackground: 'transparent',
      codeFoldBackground: 'rgba(255,255,255,0.02)',
      emptyLineBackground: 'transparent',
      gutterColor: '#52525b',
      addedGutterColor: '#a7f3d0',
      removedGutterColor: '#fecdd3',
      codeFoldContentColor: '#71717a',
      diffViewerTitleBackground: 'transparent',
      diffViewerTitleColor: '#a1a1aa',
      diffViewerTitleBorderColor: 'var(--op-border, #27272a)'
    }
  },
  contentText: {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: '11.5px',
    lineHeight: '1.5',
    whiteSpace: 'pre' as const,
    wordBreak: 'normal' as const,
    overflowWrap: 'normal' as const
  },
  line: { padding: '0 4px' },
  gutter: { minWidth: '32px', padding: '0 6px' },
  content: { whiteSpace: 'pre' as const, wordBreak: 'normal' as const }
}

interface FetchState {
  key: string
  data: GitDiffFileResult | null
  error: string | null
}

export function DiffViewer({ cwd, file }: DiffViewerProps): React.JSX.Element {
  const requestKey = `${cwd}|${file.path}|${file.staged ? 's' : 'u'}`
  const [fetchState, setFetchState] = useState<FetchState>({
    key: requestKey,
    data: null,
    error: null
  })
  const [showAllFor, setShowAllFor] = useState<string | null>(null)
  const showAll = showAllFor === file.path

  useEffect(() => {
    let cancelled = false
    window.deck.gitDiff
      .getFile({ cwd, path: file.path, staged: file.staged })
      .then((result) => {
        if (cancelled) return
        setFetchState({ key: requestKey, data: result, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setFetchState({
          key: requestKey,
          data: null,
          error: err instanceof Error ? err.message : String(err)
        })
      })
    return () => {
      cancelled = true
    }
  }, [cwd, file.path, file.staged, requestKey])

  const isStale = fetchState.key !== requestKey
  const data = isStale ? null : fetchState.data
  const error = isStale ? null : fetchState.error
  const loading = data === null && error === null

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-op-zinc-500 text-xs">
        Loading diff…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-rose-400 text-xs px-4 text-center">
        {error}
      </div>
    )
  }

  if (!data) return <div />

  if (data.isBinary || file.isBinary) {
    return (
      <div className="flex items-center justify-center h-full text-op-zinc-500 text-xs">
        Binary file — diff not shown.
      </div>
    )
  }

  const oldFull = data.oldContent ?? ''
  const newFull = data.newContent ?? ''

  let oldText = oldFull
  let newText = newFull
  let didTruncate = false
  if (!showAll) {
    const oldLines = oldFull.split('\n')
    const newLines = newFull.split('\n')
    if (oldLines.length > TRUNCATE_LINES || newLines.length > TRUNCATE_LINES) {
      didTruncate = true
      oldText = oldLines.slice(0, TRUNCATE_LINES).join('\n')
      newText = newLines.slice(0, TRUNCATE_LINES).join('\n')
    }
  }

  return (
    <div className="overflow-auto h-full w-full bg-op-surface text-op-zinc-200 deck-diff-scroll">
      <ReactDiffViewer
        oldValue={oldText}
        newValue={newText}
        splitView={false}
        useDarkTheme
        compareMethod={DiffMethod.LINES}
        styles={diffStyles}
        showDiffOnly
        hideLineNumbers={false}
      />
      {didTruncate && (
        <div className="flex items-center justify-center py-2 border-t border-op-border-dim">
          <button
            type="button"
            onClick={() => setShowAllFor(file.path)}
            className="px-3 py-1 text-[11px] font-medium text-op-zinc-200 bg-op-surface-2 hover:bg-op-zinc-800 rounded-md border border-op-border"
          >
            Show all (truncated at {TRUNCATE_LINES} lines)
          </button>
        </div>
      )}
    </div>
  )
}
