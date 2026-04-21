import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useWorkspaces, useSessions, useSearchQuery } from '@/stores/deck'
import { WorkspaceGroup } from './WorkspaceGroup'

export function WorkspaceList(): React.JSX.Element {
  const workspaces = useWorkspaces()
  const allSessions = useSessions()
  const searchQuery = useSearchQuery()

  const hasAnyMatch = useMemo(() => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return allSessions.some((s) => s.name.toLowerCase().includes(q))
  }, [allSessions, searchQuery])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-4 pt-2 pb-1.5 flex-shrink-0">
        <span className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
          Workspaces
        </span>
        <button
          onClick={() => console.log('new workspace — Task 11')}
          className="flex items-center gap-[3px] font-body text-[11px] font-medium text-op-zinc-500 bg-transparent border-0 cursor-pointer px-1.5 py-0.5 rounded-[4px] transition-colors duration-150 hover:text-accent-bright hover:bg-accent-glow"
        >
          <Plus size={11} strokeWidth={2} />
          New
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-4 sidebar-scroll">
        {workspaces.map((ws) => (
          <WorkspaceGroup key={ws.id} workspace={ws} />
        ))}

        {searchQuery && !hasAnyMatch && (
          <p className="px-4 py-6 text-center font-body text-[12px] text-op-zinc-500">
            No sessions match &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
