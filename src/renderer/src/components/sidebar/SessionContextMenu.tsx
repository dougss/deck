import type { Session } from '../../../../shared/ipc'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/ContextMenu'

interface SessionContextMenuProps {
  session: Session
  onRename: () => void
  onEditDescription: () => void
  onStop: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function SessionContextMenu({
  session,
  onRename,
  onEditDescription,
  onStop,
  onDelete,
  children
}: SessionContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem>
        <ContextMenuItem onSelect={onEditDescription}>Edit description</ContextMenuItem>
        <ContextMenuSeparator />
        {session.ptyId !== null && <ContextMenuItem onSelect={onStop}>Stop</ContextMenuItem>}
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
