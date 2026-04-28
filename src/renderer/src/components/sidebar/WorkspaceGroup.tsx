import { useMemo } from 'react'
import type { Session, SessionType, Workspace } from '../../../../shared/ipc'
import {
  useSessionsByWorkspace,
  useIsWorkspaceExpanded,
  useSearchQuery,
  useActiveSessionId,
  useDeckStore
} from '@/stores/deck'
import { WorkspaceRow } from './WorkspaceRow'
import { SessionItem } from './SessionItem'
import { WorkspaceContextMenu } from './WorkspaceContextMenu'
import { NewSessionMenu } from './NewSessionMenu'

interface WorkspaceGroupProps {
  workspace: Workspace
  customEditorCommand: string | null
  onEdit: (ws: Workspace) => void
  onDelete: (ws: Workspace) => void
  onNewSession: (ws: Workspace, type: SessionType) => void
  onDeleteSession: (session: Session) => void
}

export function WorkspaceGroup({
  workspace,
  customEditorCommand,
  onEdit,
  onDelete,
  onNewSession,
  onDeleteSession
}: WorkspaceGroupProps): React.JSX.Element {
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

  async function handleSessionClick(session: Session): Promise<void> {
    setActive(session.id)
    if (!session.ptyId) {
      if (import.meta.env.DEV) {
        console.log(`[Deck] Auto-attaching session ${session.id} on click`)
      }
      await window.deck.session.attach({ id: session.id })
    }
  }

  async function handleStop(session: Session): Promise<void> {
    await window.deck.session.detach({ id: session.id })
  }

  return (
    <div className="px-2 mb-0.5">
      <WorkspaceContextMenu onEdit={() => onEdit(workspace)} onDelete={() => onDelete(workspace)}>
        <WorkspaceRow
          workspace={workspace}
          isExpanded={isExpanded}
          sessionCount={allSessions.length}
          onToggle={() => toggleWorkspace(workspace.id)}
        />
      </WorkspaceContextMenu>

      {isExpanded && (
        <div className="flex flex-col gap-px pt-0.5 pb-1.5">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={activeSessionId === session.id}
              customEditorCommand={customEditorCommand}
              onClick={() => handleSessionClick(session)}
              onStop={() => handleStop(session)}
              onDelete={() => onDeleteSession(session)}
            />
          ))}

          <NewSessionMenu workspace={workspace} onSelect={onNewSession} />
        </div>
      )}
    </div>
  )
}
