import type { EditorPreset, Workspace } from '../../../../shared/ipc'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent
} from '@/components/ui/ContextMenu'

interface WorkspaceContextMenuProps {
  workspace: Workspace
  customEditorCommand: string | null
  onEdit: () => void
  onOpenInEditor: (editor: EditorPreset) => void
  onDelete: () => void
  children: React.ReactNode
}

export function WorkspaceContextMenu({
  workspace,
  customEditorCommand,
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
        <ContextMenuSub>
          <ContextMenuSubTrigger
            disabled={workspace.needsSetup}
            title={workspace.needsSetup ? "Path doesn't exist yet" : undefined}
          >
            Open in
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => onOpenInEditor('zed')}>Open in Zed</ContextMenuItem>
            <ContextMenuItem onSelect={() => onOpenInEditor('cursor')}>
              Open in Cursor
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onOpenInEditor('vscode')}>
              Open in VS Code
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onOpenInEditor('fork')}>Open in Fork</ContextMenuItem>
            {customEditorCommand && (
              <ContextMenuItem onSelect={() => onOpenInEditor('custom')}>
                Open in Custom
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete workspace…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
