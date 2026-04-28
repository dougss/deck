import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator
} from '@/components/ui/ContextMenu'

interface WorkspaceContextMenuProps {
  onEdit: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function WorkspaceContextMenu({
  onEdit,
  onDelete,
  children
}: WorkspaceContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onEdit}>Edit workspace…</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={onDelete}>
          Delete workspace…
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
