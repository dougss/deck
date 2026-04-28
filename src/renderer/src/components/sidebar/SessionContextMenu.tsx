import type { EditorPreset, Session } from '../../../../shared/ipc'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/ContextMenu'
import { OpenInSubmenu } from './OpenInSubmenu'

interface SessionContextMenuProps {
  session: Session
  customEditorCommand: string | null
  onRename: () => void
  onEditDescription: () => void
  onOpenInEditor: (editor: EditorPreset) => void
  onStop: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function SessionContextMenu({
  session,
  customEditorCommand,
  onRename,
  onEditDescription,
  onOpenInEditor,
  onStop,
  onDelete,
  children
}: SessionContextMenuProps): React.JSX.Element {
  const openInDisabled = !session.cwd || session.cwd.trim() === ''

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onSelect={onEditDescription}>Edit description</ContextMenuItem>
        <ContextMenuSeparator />
        <OpenInSubmenu
          disabled={openInDisabled}
          disabledTitle={openInDisabled ? 'No working directory' : undefined}
          customEditorCommand={customEditorCommand}
          onOpenInEditor={onOpenInEditor}
        />
        <ContextMenuSeparator />
        {session.ptyId !== null && <ContextMenuItem onSelect={onStop}>Stop</ContextMenuItem>}
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
