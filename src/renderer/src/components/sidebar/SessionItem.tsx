import type { Session } from '../../../../shared/ipc'
import { StatusDot, type StatusDotVariant } from '@/components/ui/StatusDot'
import { formatRelativeTime } from '@/lib/time'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onClick: () => void
}

export function SessionItem({ session, isActive, onClick }: SessionItemProps): React.JSX.Element {
  const dotVariant: StatusDotVariant = session.status === 'working' ? 'working' : 'idle'

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={[
        'grid grid-cols-[8px_1fr_auto] gap-x-2.5 items-start',
        'py-2 pr-2.5 pl-[22px] ml-1.5 rounded-[6px] cursor-pointer',
        'transition-colors duration-150',
        isActive
          ? 'bg-op-zinc-900 shadow-[inset_2px_0_0_var(--accent),inset_2px_0_12px_rgba(139,92,246,0.08)]'
          : 'hover:bg-op-zinc-900'
      ].join(' ')}
    >
      <div className="mt-[5px] flex-shrink-0">
        <StatusDot variant={dotVariant} size="md" />
      </div>
      <div className="min-w-0">
        <div
          className={`font-mono text-[13px] font-medium leading-snug truncate ${
            isActive ? 'text-op-zinc-50' : 'text-op-zinc-100'
          }`}
        >
          {session.name}
        </div>
        {session.subText && (
          <div className="font-body text-[11px] text-op-zinc-500 mt-0.5 leading-snug truncate">
            {session.subText}
          </div>
        )}
      </div>
      <div className="font-mono text-[10px] text-op-zinc-600 mt-[7px] flex-shrink-0">
        {formatRelativeTime(session.lastActiveAt)}
      </div>
    </div>
  )
}
