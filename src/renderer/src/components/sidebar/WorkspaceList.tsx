import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useWorkspaces, useSessions, useSearchQuery, useDeckStore } from '@/stores/deck'
import type { DeckSettings, Session, SessionType, Workspace } from '../../../../shared/ipc'
import { WorkspaceGroup } from './WorkspaceGroup'
import { WorkspaceDialog } from './WorkspaceDialog'
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog'
import { SessionDialog } from './SessionDialog'
import { DeleteSessionDialog } from './DeleteSessionDialog'

interface WorkspaceListProps {
  settings: DeckSettings | null
}

export function WorkspaceList({ settings }: WorkspaceListProps): React.JSX.Element {
  const workspaces = useWorkspaces()
  const allSessions = useSessions()
  const searchQuery = useSearchQuery()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)

  const [sessionCreateWs, setSessionCreateWs] = useState<Workspace | null>(null)
  const [sessionDeleteTarget, setSessionDeleteTarget] = useState<Session | null>(null)
  const setActive = useDeckStore((s) => s.setActive)

  async function handleNewSession(ws: Workspace, type: SessionType): Promise<void> {
    if (type === 'shell') {
      try {
        const session = await window.deck.session.create({
          workspaceId: ws.id,
          name: 'zsh',
          cwd: ws.path,
          command: '',
          type: 'shell'
        })
        setActive(session.id)
        window.deck.session.attach({ id: session.id }).catch((err) => {
          console.error('[Deck] Auto-attach shell session failed:', err)
        })
      } catch (err) {
        console.error('[Deck] Create shell session failed:', err)
      }
    } else {
      setSessionCreateWs(ws)
    }
  }

  const hasAnyMatch = useMemo(() => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return allSessions.some((s) => s.name.toLowerCase().includes(q))
  }, [allSessions, searchQuery])

  const deleteSessionCount = useMemo(
    () => (deleteTarget ? allSessions.filter((s) => s.workspaceId === deleteTarget.id).length : 0),
    [allSessions, deleteTarget]
  )

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 pt-2 pb-1.5 flex-shrink-0">
          <span className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
            Workspaces
          </span>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-[3px] font-body text-[11px] font-medium text-op-zinc-500 bg-transparent border-0 cursor-pointer px-1.5 py-0.5 rounded-[4px] transition-colors duration-150 hover:text-accent-bright hover:bg-accent-glow"
          >
            <Plus size={11} strokeWidth={2} />
            New
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4 sidebar-scroll">
          {workspaces.map((ws) => (
            <WorkspaceGroup
              key={ws.id}
              workspace={ws}
              customEditorCommand={settings?.customEditorCommand ?? null}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
              onNewSession={handleNewSession}
              onDeleteSession={setSessionDeleteTarget}
            />
          ))}

          {searchQuery && !hasAnyMatch && (
            <p className="px-4 py-6 text-center font-body text-[12px] text-op-zinc-500">
              No sessions match &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>
      </div>

      {createOpen && <WorkspaceDialog mode="create" onClose={() => setCreateOpen(false)} />}
      {editTarget && (
        <WorkspaceDialog mode="edit" workspace={editTarget} onClose={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteWorkspaceDialog
          workspace={deleteTarget}
          sessionCount={deleteSessionCount}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {sessionCreateWs && (
        <SessionDialog
          workspace={sessionCreateWs}
          defaultCommand={settings?.defaultExecutorCommand ?? 'claude'}
          onClose={() => setSessionCreateWs(null)}
        />
      )}
      {sessionDeleteTarget && (
        <DeleteSessionDialog
          session={sessionDeleteTarget}
          onClose={() => setSessionDeleteTarget(null)}
        />
      )}
    </>
  )
}
