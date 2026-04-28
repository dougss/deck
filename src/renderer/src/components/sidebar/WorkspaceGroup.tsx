import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import type { Session, Workspace } from '../../../../shared/ipc'
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

interface WorkspaceGroupProps {
  workspace: Workspace
  customEditorCommand: string | null
  onEdit: (ws: Workspace) => void
  onDelete: (ws: Workspace) => void
  onNewSession: (ws: Workspace) => void
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

          <button
            onClick={workspace.needsSetup ? undefined : () => onNewSession(workspace)}
            disabled={workspace.needsSetup}
            title={
              workspace.needsSetup
                ? "Workspace path doesn't exist. Edit workspace first."
                : undefined
            }
            className="flex items-center gap-1.5 ml-1.5 mt-0.5 px-2.5 py-1.5 rounded-[5px] font-body text-[11px] font-medium text-op-zinc-600 hover:text-op-zinc-400 hover:bg-op-zinc-900 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-op-zinc-600"
          >
            <Plus size={10} strokeWidth={2} />
            New session
          </button>
        </div>
      )}
    </div>
  )
}
