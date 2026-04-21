import { useMemo } from 'react'
import type { Workspace } from '../../../../shared/ipc'
import {
  useSessionsByWorkspace,
  useIsWorkspaceExpanded,
  useSearchQuery,
  useActiveSessionId,
  useDeckStore
} from '@/stores/deck'
import { WorkspaceRow } from './WorkspaceRow'
import { SessionItem } from './SessionItem'

interface WorkspaceGroupProps {
  workspace: Workspace
}

export function WorkspaceGroup({ workspace }: WorkspaceGroupProps): React.JSX.Element {
  const allSessions = useSessionsByWorkspace(workspace.id)
  const searchQuery = useSearchQuery()
  const isExpanded = useIsWorkspaceExpanded(workspace.id)
  const activeSessionId = useActiveSessionId()
  const toggleWorkspace = useDeckStore((s) => s.toggleWorkspace)
  const setActive = useDeckStore((s) => s.setActive)

  const sessions = useMemo(() => {
    if (!searchQuery) return allSessions
    const q = searchQuery.toLowerCase()
    return allSessions.filter((s) => s.name.toLowerCase().includes(q))
  }, [allSessions, searchQuery])

  return (
    <div className="px-2 mb-0.5">
      <WorkspaceRow
        workspace={workspace}
        isExpanded={isExpanded}
        sessionCount={allSessions.length}
        onToggle={() => toggleWorkspace(workspace.id)}
      />
      {isExpanded && sessions.length > 0 && (
        <div className="flex flex-col gap-px pt-0.5 pb-1.5">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={activeSessionId === session.id}
              onClick={() => setActive(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
