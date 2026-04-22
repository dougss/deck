import type { Workspace } from '../../../../shared/ipc'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/ContextMenu'

interface WorkspaceContextMenuProps {
  workspace: Workspace
  openInEditorLabel: string
  onEdit: () => void
  onOpenInEditor: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function WorkspaceContextMenu({
  workspace,
  openInEditorLabel,
  onEdit,
  onOpenInEditor,
  onDelete,
  children
}: WorkspaceContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onEdit}>Edit workspace…</ContextMenuItem>
        <ContextMenuItem
          disabled={workspace.needsSetup}
          title={workspace.needsSetup ? "Path doesn't exist yet" : undefined}
          onSelect={onOpenInEditor}
        >
          {openInEditorLabel}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete workspace…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
