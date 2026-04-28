import type { EditorPreset } from '../../../../shared/ipc'
import {
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem
} from '@/components/ui/ContextMenu'

interface OpenInSubmenuProps {
  disabled?: boolean
  disabledTitle?: string
  customEditorCommand: string | null
  onOpenInEditor: (editor: EditorPreset) => void
}

export function OpenInSubmenu({
  disabled,
  disabledTitle,
  customEditorCommand,
  onOpenInEditor
}: OpenInSubmenuProps): React.JSX.Element {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger disabled={disabled} title={disabled ? disabledTitle : undefined}>
        Open in
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem onSelect={() => onOpenInEditor('zed')}>Open in Zed</ContextMenuItem>
        <ContextMenuItem onSelect={() => onOpenInEditor('cursor')}>Open in Cursor</ContextMenuItem>
        <ContextMenuItem onSelect={() => onOpenInEditor('vscode')}>Open in VS Code</ContextMenuItem>
        <ContextMenuItem onSelect={() => onOpenInEditor('fork')}>Open in Fork</ContextMenuItem>
        {customEditorCommand && (
          <ContextMenuItem onSelect={() => onOpenInEditor('custom')}>
            Open in Custom
          </ContextMenuItem>
        )}
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
