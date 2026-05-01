import { useState } from 'react'
import type { EditorPreset, Session } from '../../../../shared/ipc'
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

interface OutlineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

function OutlineButton({
  children,
  className = '',
  size = 'sm',
  disabled,
  ...props
}: OutlineButtonProps): React.JSX.Element {
  const sizeClasses = {
    sm: 'h-7 px-2.5 text-[12px]',
    md: 'h-8 px-3 text-[13px]',
    lg: 'h-9 px-4 text-[14px]'
  }

  const buttonClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-body font-medium rounded-md',
    'transition-colors duration-75 outline-none border',
    'focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
    'border-op-border bg-transparent hover:bg-op-zinc-800 text-op-zinc-200 active:bg-op-zinc-900',
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={buttonClasses} disabled={disabled} {...props}>
      {children}
    </button>
  )
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
        <OutlineButton
          size="sm"
          onClick={handlePrimaryClick}
          disabled={disabled}
          title={disabled ? 'No working directory' : `Open in ${editorLabel}`}
          className="rounded-r-none border-r-0"
        >
          {icon}
          <span>{editorLabel}</span>
        </OutlineButton>

        <div className="shrink-0 w-px h-5 self-center bg-op-border" />

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <OutlineButton
              size="sm"
              disabled={disabled}
              title={disabled ? 'No working directory' : 'Choose editor'}
              className="rounded-l-none border-l-0 px-2"
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </OutlineButton>
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
