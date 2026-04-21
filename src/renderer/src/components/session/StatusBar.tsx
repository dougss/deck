import { Kbd, StatusDot, type StatusDotVariant } from '../ui'
import { useActiveSession } from '@/stores/deck'

export function StatusBar(): React.JSX.Element {
  const session = useActiveSession()
  const dotVariant: StatusDotVariant = session?.status === 'working' ? 'working' : 'idle'
  const statusLabel = session ? session.status : 'ready'
  const statusColor = session ? 'text-op-zinc-300' : 'text-op-zinc-500'

  return (
    <div className="h-8 flex-shrink-0 flex items-center justify-between px-4 border-t border-op-border bg-op-surface-2 font-mono text-[11px]">
      <div className="flex items-center gap-[10px]">
        <StatusDot variant={dotVariant} size="sm" />
        <span className={statusColor}>{statusLabel}</span>
        <span className="text-op-zinc-700">•</span>
        <span className="text-op-zinc-500" title="Available in Phase 3 via Claude Code hooks">
          —
        </span>
        <span className="text-op-zinc-700">•</span>
        <span className="text-op-zinc-500" title="Available in Phase 3 via Claude Code hooks">
          —
        </span>
      </div>
      <div className="flex items-center gap-[10px]">
        <span className="flex items-center gap-1.5 text-op-zinc-600">
          <Kbd>⌘1-9</Kbd> switch
        </span>
        <span className="text-op-zinc-700">•</span>
        <span className="flex items-center gap-1.5 text-op-zinc-600">
          <Kbd>⌘N</Kbd> new
        </span>
        <span className="text-op-zinc-700">•</span>
        <span className="flex items-center gap-1.5 text-op-zinc-600">
          <Kbd>⌘W</Kbd> close
        </span>
      </div>
    </div>
  )
}
