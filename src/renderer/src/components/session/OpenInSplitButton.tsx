import type { EditorPreset, Session } from '../../../../shared/ipc'
import { useLastOpenInEditor } from '@/hooks/useLastOpenInEditor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { ChevronDown, Code, SquareCode, Zap, Wrench } from 'lucide-react'

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

function getEditorIcon(editor: EditorPreset): React.ReactNode {
  switch (editor) {
    case 'zed':
      return <Zap size={14} strokeWidth={1.75} />
    case 'cursor':
      return <Code size={14} strokeWidth={1.75} />
    case 'vscode':
      return <SquareCode size={14} strokeWidth={1.75} />
    case 'fork':
      // Custom SVG for Fork since it's not in lucide-react
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 12 18 6 12 0 6 6 12 12" />
          <path d="M12 22V12" />
          <path d="M8 6H4" />
          <path d="M16 6h4" />
        </svg>
      )
    case 'custom':
      return <Wrench size={14} strokeWidth={1.75} />
    default:
      return <Zap size={14} strokeWidth={1.75} />
  }
}

export function OpenInSplitButton({
  session,
  customEditorCommand
}: OpenInSplitButtonProps): React.JSX.Element {
  const [lastEditor, setLastEditor] = useLastOpenInEditor()
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
  }

  const editorLabel = getEditorLabel(lastEditor)
  const icon = getEditorIcon(lastEditor) // Fixed: now passing the editor to get the correct icon

  return (
    <div className="flex items-center h-7">
      <div className="flex rounded-md overflow-hidden border border-op-border">
        <button
          onClick={handlePrimaryClick}
          disabled={disabled}
          title={disabled ? 'No working directory' : `Open in ${editorLabel}`}
          className="inline-flex items-center justify-center gap-2 h-7 px-2.5 text-[12px] font-body font-medium transition-colors duration-75 outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-op-zinc-800 text-op-zinc-200 active:bg-op-zinc-900"
        >
          {icon}
          <span>{editorLabel}</span>
        </button>

        <div className="w-px h-5 bg-op-border self-center" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={disabled}
              title={disabled ? 'No working directory' : 'Choose editor'}
              className="inline-flex items-center justify-center h-7 px-2 transition-colors duration-75 outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-op-zinc-800 text-op-zinc-200 active:bg-op-zinc-900"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void handleSelectEditor('zed')}>Zed</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleSelectEditor('cursor')}>
              Cursor
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleSelectEditor('vscode')}>
              VS Code
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleSelectEditor('fork')}>
              Fork
            </DropdownMenuItem>
            {customEditorCommand && customEditorCommand.trim() !== '' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleSelectEditor('custom')}>
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
