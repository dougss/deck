import { FileText, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeckStore } from '@/stores/deck'

interface ActivityIconProps {
  icon: React.ReactNode
  active: boolean
  title: string
  onClick: () => void
}

function ActivityIcon({ icon, active, title, onClick }: ActivityIconProps): React.JSX.Element {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-100',
        active
          ? 'text-op-zinc-100 bg-op-accent-soft'
          : 'text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-2'
      )}
    >
      {active && (
        <span className="absolute left-[-8px] top-[6px] bottom-[6px] w-[2px] bg-op-accent rounded-[1px]" />
      )}
      {icon}
    </button>
  )
}

export function ActivityBar(): React.JSX.Element {
  const activePanel = useDeckStore((s) => s.activeRightPanel)
  const toggleRightPanel = useDeckStore((s) => s.toggleRightPanel)

  return (
    <div className="flex flex-col items-center gap-1.5 pt-2.5 w-12 shrink-0 bg-op-surface border-l border-op-border">
      <ActivityIcon
        icon={<FileText size={18} strokeWidth={1.6} />}
        active={activePanel === 'planner'}
        title="Planner (⌘\)"
        onClick={() => toggleRightPanel('planner')}
      />
      <ActivityIcon
        icon={<Terminal size={18} strokeWidth={1.6} />}
        active={activePanel === 'terminal'}
        title="Terminal (⌘\)"
        onClick={() => toggleRightPanel('terminal')}
      />
    </div>
  )
}
