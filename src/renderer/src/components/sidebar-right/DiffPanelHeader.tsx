import { RefreshCw } from 'lucide-react'

interface DiffPanelHeaderProps {
  fileCount: number
  busy: boolean
  onRefresh: () => void
}

export function DiffPanelHeader({
  fileCount,
  busy,
  onRefresh
}: DiffPanelHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-op-border bg-op-surface shrink-0 h-9">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="font-display text-[13px] font-semibold text-op-zinc-100">Changes</span>
        <span className="font-mono text-[11px] text-op-zinc-500">
          {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        title="Refresh"
        className="flex items-center justify-center w-6 h-6 rounded-md text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={13} strokeWidth={1.7} className={busy ? 'animate-spin' : undefined} />
      </button>
    </div>
  )
}
