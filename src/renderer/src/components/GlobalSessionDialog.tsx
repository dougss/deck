import { useDeckStore, useWorkspaces } from '@/stores/deck'
import { SessionDialog } from './sidebar/SessionDialog'

export function GlobalSessionDialog(): React.JSX.Element | null {
  const workspaceId = useDeckStore((s) => s.newSessionDialogWorkspaceId)
  const closeDialog = useDeckStore((s) => s.closeNewSessionDialog)
  const workspaces = useWorkspaces()

  if (!workspaceId) return null

  const workspace = workspaces.find((w) => w.id === workspaceId)
  if (!workspace) return null

  return <SessionDialog workspace={workspace} onClose={closeDialog} />
}
