import { useState } from 'react'
import { Zap, MousePointer2, Code2, GitBranch, Terminal } from 'lucide-react'
import type { EditorPreset } from '../../../../shared/ipc'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/Dialog'

interface EditorCard {
  id: EditorPreset
  label: string
  description: string
  Icon: React.ElementType
}

const EDITORS: EditorCard[] = [
  { id: 'zed', label: 'Zed', description: 'Fast, collaborative editor', Icon: Zap },
  { id: 'cursor', label: 'Cursor', description: 'AI-first code editor', Icon: MousePointer2 },
  { id: 'vscode', label: 'VS Code', description: 'Popular open-source editor', Icon: Code2 },
  { id: 'fork', label: 'Fork', description: 'Git client with diff view', Icon: GitBranch },
  { id: 'custom', label: 'Custom', description: 'Use your own command', Icon: Terminal }
]

const METACHAR = /[;&|$><`\\]/

interface EditorPreferenceDialogProps {
  workspacePath: string
  onSaved: () => void
  onClose: () => void
}

export function EditorPreferenceDialog({
  workspacePath,
  onSaved,
  onClose
}: EditorPreferenceDialogProps): React.JSX.Element {
  const [selected, setSelected] = useState<EditorPreset | null>(null)
  const [customCommand, setCustomCommand] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (!selected) return 'Select an editor to continue.'
    if (selected === 'custom') {
      if (!customCommand.trim()) return 'Enter a command for your editor.'
      if (METACHAR.test(customCommand))
        return 'Command contains invalid characters (; & | $ > < ` \\).'
    }
    return null
  }

  async function handleOpen(): Promise<void> {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await window.deck.settings.set({
        preferredEditor: selected,
        customEditorCommand: selected === 'custom' ? customCommand.trim() : null
      })
      await window.deck.system.openInEditor({ workspacePath })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save preference.')
      setSubmitting(false)
    }
  }

  const openLabel =
    selected === 'zed'
      ? 'Open in Zed'
      : selected === 'cursor'
        ? 'Open in Cursor'
        : selected === 'vscode'
          ? 'Open in VS Code'
          : selected === 'fork'
            ? 'Open in Fork'
            : selected === 'custom'
              ? 'Open in Editor'
              : 'Open'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose your editor</DialogTitle>
          <DialogDescription>
            Select which editor opens when you click &ldquo;Open in IDE&rdquo;. You can change this
            later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {EDITORS.map(({ id, label, description, Icon }) => {
              const isSelected = selected === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={[
                    'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all duration-100 cursor-pointer',
                    isSelected
                      ? 'border-accent bg-[rgba(124,58,237,0.12)] text-op-zinc-100'
                      : 'border-op-zinc-800 bg-op-zinc-900 text-op-zinc-400 hover:border-op-zinc-700 hover:text-op-zinc-300'
                  ].join(' ')}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={isSelected ? 'text-accent' : 'text-op-zinc-500'}
                  />
                  <span className="font-display font-semibold text-[13px]">{label}</span>
                  <span className="font-body text-[11px] leading-relaxed opacity-80">
                    {description}
                  </span>
                </button>
              )
            })}
          </div>

          {selected === 'custom' && (
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Editor command
              </label>
              <input
                autoFocus
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="e.g. my-editor"
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Binary name or path. The workspace path is appended automatically.
              </p>
            </div>
          )}

          {error && <p className="font-body text-[12px] text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              className="h-9 px-4 bg-op-zinc-800 hover:bg-op-zinc-700 rounded-[7px] font-body text-[13px] font-medium text-op-zinc-200 transition-colors duration-100"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleOpen}
            disabled={submitting}
            className="h-9 px-4 bg-accent hover:bg-accent-bright rounded-[7px] font-body text-[13px] font-medium text-white transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Opening…' : openLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
