import { FileText } from 'lucide-react'

export function PlannerEmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-7 py-8 gap-4">
      <div className="flex items-center justify-center w-11 h-11 rounded-[10px] bg-op-surface-2 border border-op-border text-op-accent shrink-0">
        <FileText size={22} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display font-semibold text-sm text-op-zinc-100 m-0">No planner yet</h3>
        <p className="text-op-zinc-400 text-xs leading-relaxed max-w-[280px] m-0">
          Start a conversational planning session scoped to this workspace. Claude will read files
          and discuss architecture — it can't edit or run commands.
        </p>
      </div>
      <button
        disabled
        className="mt-1 px-3.5 py-1.5 bg-op-accent text-white border-none rounded-md text-xs font-semibold cursor-not-allowed opacity-40"
      >
        + Start planner
      </button>
      <span className="font-mono text-[10.5px] text-op-zinc-500">available in phase 3 task 3</span>
    </div>
  )
}
