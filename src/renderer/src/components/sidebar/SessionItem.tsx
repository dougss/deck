import { useRef, useEffect } from 'react'
import { Terminal, Server } from 'lucide-react'
import { StatusDot, type StatusDotVariant } from '@/components/ui/StatusDot'
import { formatRelativeTime } from '@/lib/time'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeckStore } from '@/stores/deck'
import type { EditorPreset, Session } from '../../../../shared/ipc'
import { SessionContextMenu } from './SessionContextMenu'

interface SessionItemProps {
  session: Session
  isActive: boolean
  customEditorCommand: string | null
  onClick: () => void
  onStop: () => void
  onDelete: () => void
}

export function SessionItem({
  session,
  isActive,
  customEditorCommand,
  onClick,
  onStop,
  onDelete
}: SessionItemProps): React.JSX.Element {
  const notificationState = useDeckStore((s) => s.notificationStates[session.id] ?? 'idle')

  let dotVariant: StatusDotVariant
  if (!isActive && notificationState === 'error') {
    dotVariant = 'error'
  } else if (!isActive && notificationState === 'pending') {
    dotVariant = 'pending'
  } else if (session.status === 'working') {
    dotVariant = 'working'
  } else {
    dotVariant = 'idle'
  }

  const nameEdit = useInlineEdit(session.name)
  const subTextEdit = useInlineEdit(session.subText)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const subTextInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (nameEdit.isEditing) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [nameEdit.isEditing])

  useEffect(() => {
    if (subTextEdit.isEditing) {
      subTextInputRef.current?.focus()
      subTextInputRef.current?.select()
    }
  }, [subTextEdit.isEditing])

  async function handleNameSave(): Promise<void> {
    const value = nameEdit.confirmEdit()
    if (value && value !== session.name) {
      await window.deck.session.update({ id: session.id, patch: { name: value } })
    }
  }

  async function handleSubTextSave(): Promise<void> {
    const value = subTextEdit.confirmEdit()
    if (value !== session.subText) {
      await window.deck.session.update({ id: session.id, patch: { subText: value } })
    }
  }

  function handleOpenInEditor(editor: EditorPreset): void {
    void window.deck.system.openInEditor({ workspacePath: session.cwd, editor })
  }

  const isEditing = nameEdit.isEditing || subTextEdit.isEditing

  return (
    <SessionContextMenu
      session={session}
      customEditorCommand={customEditorCommand}
      onRename={nameEdit.startEdit}
      onEditDescription={subTextEdit.startEdit}
      onOpenInEditor={handleOpenInEditor}
      onStop={onStop}
      onDelete={onDelete}
    >
      <div
        onClick={() => {
          if (!isEditing) onClick()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isEditing && e.key === 'Enter') onClick()
        }}
        className={[
          'grid grid-cols-[8px_1fr_auto] gap-x-2.5 items-start',
          'py-2 pr-2.5 pl-[22px] ml-1.5 rounded-[6px] cursor-pointer',
          'transition-colors duration-150',
          isActive
            ? 'bg-op-zinc-900 shadow-[inset_2px_0_0_var(--accent),inset_2px_0_12px_rgba(139,92,246,0.08)]'
            : 'hover:bg-op-zinc-900'
        ].join(' ')}
      >
        <div className="mt-[5px] flex-shrink-0">
          <StatusDot variant={dotVariant} size="md" />
        </div>

        <div className="min-w-0">
          {nameEdit.isEditing ? (
            <input
              ref={nameInputRef}
              value={nameEdit.draft}
              onChange={(e) => nameEdit.setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleNameSave()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  nameEdit.cancelEdit()
                }
              }}
              onBlur={handleNameSave}
              onClick={(e) => e.stopPropagation()}
              className="w-full font-mono text-[13px] font-medium text-op-zinc-50 bg-op-zinc-800 border border-accent rounded px-1 -mx-1 outline-none leading-snug"
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation()
                nameEdit.startEdit()
              }}
              className={`flex items-center gap-1 font-mono text-[13px] font-medium leading-snug truncate ${isActive ? 'text-op-zinc-50' : 'text-op-zinc-100'}`}
            >
              {session.type === 'shell' && (
                <Terminal size={9} strokeWidth={1.75} className="text-op-zinc-600 flex-shrink-0" />
              )}
              {session.type === 'ssh' && (
                <Server size={9} strokeWidth={1.75} className="text-op-zinc-600 flex-shrink-0" />
              )}
              {session.name}
            </div>
          )}

          {subTextEdit.isEditing ? (
            <input
              ref={subTextInputRef}
              value={subTextEdit.draft}
              onChange={(e) => subTextEdit.setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubTextSave()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  subTextEdit.cancelEdit()
                }
              }}
              onBlur={handleSubTextSave}
              onClick={(e) => e.stopPropagation()}
              className="w-full font-body text-[11px] text-op-zinc-400 bg-op-zinc-800 border border-accent rounded px-1 -mx-1 outline-none mt-0.5 leading-snug"
            />
          ) : (
            session.subText && (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  subTextEdit.startEdit()
                }}
                className="font-body text-[11px] text-op-zinc-500 mt-0.5 leading-snug truncate"
              >
                {session.subText}
              </div>
            )
          )}
        </div>

        <div className="font-mono text-[10px] text-op-zinc-600 mt-[7px] flex-shrink-0">
          {formatRelativeTime(session.lastActiveAt)}
        </div>
      </div>
    </SessionContextMenu>
  )
}
