import { useShallow } from 'zustand/shallow'
import { Kbd, StatusDot, type StatusDotVariant } from '../ui'
import { useActiveSession, useDeckStore } from '@/stores/deck'

function formatCounts(running: number, stopped: number): string {
  const parts: string[] = []
  if (running > 0) parts.push(`${running} running`)
  if (stopped > 0) parts.push(`${stopped} stopped`)
  return parts.join(', ')
}

export function StatusBar(): React.JSX.Element {
  const session = useActiveSession()
  const { runningCount, stoppedCount } = useDeckStore(
    useShallow((s) => ({
      runningCount: s.sessions.filter((x) => x.ptyId !== null).length,
      stoppedCount: s.sessions.filter((x) => x.ptyId === null).length
    }))
  )

  const dotVariant: StatusDotVariant =
    session?.ptyId !== null && session !== null ? 'working' : 'idle'
  const statusLabel = session ? session.status : 'ready'
  const statusColor = session ? 'text-op-zinc-300' : 'text-op-zinc-500'

  const pid = session?.pid ?? null
  const counts = formatCounts(runningCount, stoppedCount)

  return (
    <div className="h-8 flex-shrink-0 flex items-center justify-between px-4 border-t border-op-border bg-op-surface-2 font-mono text-[11px]">
      <div className="flex items-center gap-[10px]">
        <StatusDot variant={dotVariant} size="sm" />
        <span className={statusColor}>{statusLabel}</span>
        {pid !== null && (
          <>
            <span className="text-op-zinc-700">•</span>
            <span className="text-op-zinc-500 text-[10px]">pid:{pid}</span>
          </>
        )}
        {counts.length > 0 && (
          <>
            <span className="text-op-zinc-700">•</span>
            <span className="text-op-zinc-500">{counts}</span>
          </>
        )}
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
