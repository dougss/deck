import { ChevronDown } from 'lucide-react'

import type { EditorPreset, Session } from '../../../../shared/ipc'
import { useLastOpenInEditor } from '../../hooks/useLastOpenInEditor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/DropdownMenu'
import { IconButton } from '../ui/IconButton'

interface OpenInSplitButtonProps {
  session: Session
  customEditorCommand: string | null
}

function getEditorMeta(editor: EditorPreset): { label: string; icon: string } {
  switch (editor) {
    case 'zed':
      return { label: 'Zed', icon: '🔍' }
    case 'cursor':
      return { label: 'Cursor', icon: '⟧' }
    case 'vscode':
      return { label: 'VS Code', icon: '.Code' }
    case 'fork':
      return { label: 'Fork', icon: '.ipv' }
    case 'custom':
      return { label: 'Custom', icon: '⚙️' }
    default:
      return { label: 'Zed', icon: '🔍' }
  }
}

export function OpenInSplitButton({
  session,
  customEditorCommand
}: OpenInSplitButtonProps): React.JSX.Element {
  const [lastEditor, setLastEditor] = useLastOpenInEditor()

  const editorPresets: EditorPreset[] = ['zed', 'cursor', 'vscode', 'fork']
  const hasCustomEditor = !!customEditorCommand

  // Show "No working directory" tooltip if there's no cwd
  const isDisabled = !session?.cwd || session.cwd.trim() === ''

  // Handle opening editor, with fallback for custom editor when command is empty
  const handleOpenInEditor = (editor: EditorPreset): void => {
    // If editor is 'custom' but no custom command is set, fall back to 'zed'
    if (editor === 'custom' && (!customEditorCommand || customEditorCommand.trim() === '')) {
      void window.deck.openInEditor(session.id, 'zed', session.cwd)
      return
    }

    void window.deck.openInEditor(session.id, editor, session.cwd)
  }

  // Click handler for primary button
  const handlePrimaryClick = (): void => {
    handleOpenInEditor(lastEditor)
  }

  // Handle selection from dropdown
  const handleSelect = (editor: EditorPreset): void => {
    handleOpenInEditor(editor)
    setLastEditor(editor)
  }

  const selectedEditorMeta = getEditorMeta(lastEditor)

  // Filter editors for dropdown
  const filteredEditors = [...editorPresets]
  if (hasCustomEditor) {
    filteredEditors.push('custom')
  }

  return (
    <div className="inline-flex items-center rounded-md border border-input">
      <button
        onClick={handlePrimaryClick}
        disabled={isDisabled}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        title={isDisabled ? 'No working directory' : `Open in ${selectedEditorMeta.label}`}
      >
        <span>{selectedEditorMeta.icon}</span>
        <span>{selectedEditorMeta.label}</span>
      </button>
      <div className="h-4 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            label="Open in editor"
            disabled={isDisabled}
            className="h-full w-6 rounded-none px-1.5 text-xs hover:bg-accent disabled:opacity-50"
            title={isDisabled ? 'No working directory' : 'Open in editor'}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {filteredEditors.map((editor) => {
            const meta = getEditorMeta(editor)
            return (
              <DropdownMenuItem key={editor} onClick={() => handleSelect(editor)}>
                <span className="mr-2">{meta.icon}</span>
                {meta.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
