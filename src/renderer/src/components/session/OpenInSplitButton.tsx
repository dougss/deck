import { useState } from 'react'
import type { EditorPreset, Session } from '../../../../shared/ipc'
import { Button, Separator } from '@/components/ui'
import { useLastOpenInEditor } from '@/hooks/useLastOpenInEditor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { ChevronDown } from 'lucide-react'

interface OpenInSplitButtonProps {
  session: Session
  customEditorCommand: string | null
}

function getEditorLabel(editor: EditorPreset): string {
  switch (editor) {
    case 'zed':
      return 'Zed'
    case 'cursor':
      return 'Cursor'
    case 'vscode':
      return 'VS Code'
    case 'fork':
      return 'Fork'
    case 'custom':
      return 'Custom'
  }
}

function getEditorIcon(): React.ReactNode {
  // Icons can be added here if needed
  return null
}

export function OpenInSplitButton({
  session,
  customEditorCommand
}: OpenInSplitButtonProps): React.JSX.Element {
  const [lastEditor, setLastEditor] = useLastOpenInEditor()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const disabled = !session.cwd || session.cwd.trim() === ''

  const handlePrimaryClick = async (): Promise<void> => {
    if (disabled) return

    let editorToUse = lastEditor

    // Handle the special case where lastEditor is 'custom' but no custom command is configured
    if (lastEditor === 'custom' && (!customEditorCommand || customEditorCommand.trim() === '')) {
      editorToUse = 'zed'
      // Don't update the last editor preference in this case
      await window.deck.system.openInEditor({ workspacePath: session.cwd, editor: editorToUse })
      return
    }

    await window.deck.system.openInEditor({ workspacePath: session.cwd, editor: editorToUse })
  }

  const handleSelectEditor = async (editor: EditorPreset): Promise<void> => {
    if (disabled) return

    await window.deck.system.openInEditor({ workspacePath: session.cwd, editor })
    setLastEditor(editor)
    setIsDropdownOpen(false)
  }

  const editorLabel = getEditorLabel(lastEditor)
  const icon = getEditorIcon()

  return (
    <div className="flex items-center h-7">
      <div className="flex rounded-md overflow-hidden border border-op-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrimaryClick}
          disabled={disabled}
          title={disabled ? 'No working directory' : `Open in ${editorLabel}`}
          className="rounded-r-none border-r-0"
        >
          {icon}
          <span>{editorLabel}</span>
        </Button>

        <Separator orientation="vertical" className="h-5 self-center bg-op-border" />

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title={disabled ? 'No working directory' : 'Choose editor'}
              className="rounded-l-none border-l-0 px-2"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleSelectEditor('zed')}>Zed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSelectEditor('cursor')}>
              Cursor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSelectEditor('vscode')}>
              VS Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleSelectEditor('fork')}>
              Fork
            </DropdownMenuItem>
            {customEditorCommand && customEditorCommand.trim() !== '' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSelectEditor('custom')}>
                  Custom
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
