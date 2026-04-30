import { Pin, Settings, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeckStore } from '@/stores/deck'
import type { Session } from '../../../../shared/ipc'

interface PlannerHeaderProps {
  planner: Session | null
  onStop: () => void
  onOpenSettings: () => void
}

export function PlannerHeader({
  planner,
  onStop,
  onOpenSettings
}: PlannerHeaderProps): React.JSX.Element {
  const pinned = useDeckStore((s) => s.rightPanelPinned)
  const setRightPanelPinned = useDeckStore((s) => s.setRightPanelPinned)
  const parentSession = useDeckStore((s) =>
    planner?.parentSessionId
      ? (s.sessions.find((x) => x.id === planner.parentSessionId) ?? null)
      : null
  )
  const isAttached = planner?.ptyId != null

  return (
    <div className="flex items-center justify-between px-3.5 py-[11px] border-b border-op-border-soft shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            isAttached ? 'bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.18)]' : 'bg-op-zinc-600'
          )}
        />
        <span className="font-display font-semibold text-[13px] text-op-zinc-100 shrink-0">
          Planner
        </span>
        {planner && (
          <span className="font-mono text-[11px] text-op-zinc-400 truncate">
            · {parentSession?.name ?? 'Unknown'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          title="Planner settings"
          onClick={onOpenSettings}
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-3 transition-colors duration-100"
        >
          <Settings size={14} strokeWidth={1.6} />
        </button>

        <button
          title={pinned ? 'Unpin panel (overlay)' : 'Pin panel (push main)'}
          onClick={() => setRightPanelPinned(!pinned)}
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors duration-100',
            pinned
              ? 'text-op-accent bg-op-accent-soft'
              : 'text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-3'
          )}
        >
          <Pin size={14} strokeWidth={1.6} fill={pinned ? 'currentColor' : 'none'} />
        </button>

        {isAttached && (
          <button
            title="Stop planner"
            onClick={onStop}
            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-3 transition-colors duration-100"
          >
            <Square size={13} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  )
}
