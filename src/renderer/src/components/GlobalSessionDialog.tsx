import { useDeckStore, useWorkspaces } from '@/stores/deck'
import { SessionDialog } from './sidebar/SessionDialog'

export function GlobalSessionDialog(): React.JSX.Element | null {
  const workspaceId = useDeckStore((s) => s.newSessionDialogWorkspaceId)
  const initialType = useDeckStore((s) => s.newSessionDialogInitialType)
  const closeDialog = useDeckStore((s) => s.closeNewSessionDialog)
  const workspaces = useWorkspaces()

  if (!workspaceId || workspaces.length === 0) return null

  const workspace = workspaces.find((w) => w.id === workspaceId)
  if (!workspace) return null

  return (
    <SessionDialog
      initialWorkspace={workspace}
      workspaces={workspaces}
      initialType={initialType ?? undefined}
      onClose={closeDialog}
    />
  )
}
