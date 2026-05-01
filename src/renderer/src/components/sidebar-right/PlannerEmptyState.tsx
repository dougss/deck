import { FileText } from 'lucide-react'
import { useDeckStore, useActiveSession, useActiveWorkspace } from '@/stores/deck'

export function PlannerEmptyState(): React.JSX.Element {
  const activeSession = useActiveSession()
  const activeWorkspace = useActiveWorkspace()
  const createPlanner = useDeckStore((s) => s.createPlanner)

  const disabled =
    !activeSession ||
    activeSession.kind !== 'executor' ||
    !activeWorkspace ||
    activeWorkspace.needsSetup

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-7 py-8 gap-4">
      <div className="flex items-center justify-center w-11 h-11 rounded-[10px] bg-op-surface-2 border border-op-border text-op-accent shrink-0">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display font-semibold text-sm text-op-zinc-100 m-0">No planner yet</h3>
        <p className="text-op-zinc-400 text-xs leading-relaxed max-w-[280px] m-0">
          Start a conversational planning session for this session. Claude will read files and
          discuss architecture — it can&apos;t edit or run commands.
        </p>
      </div>
      <button
        disabled={disabled}
        onClick={() => void createPlanner()}
        className="mt-1 px-3.5 py-1.5 bg-op-accent text-white border-none rounded-md text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer hover:opacity-90"
      >
        {activeSession ? `+ Start planner for ${activeSession.name}` : '+ Start planner'}
      </button>
    </div>
  )
}
