import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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

const METACHAR = /[;&|$><`\\]/

interface SettingsDialogProps {
  onSaved: () => Promise<void>
  onClose: () => void
}

export function SettingsDialog({ onSaved, onClose }: SettingsDialogProps): React.JSX.Element {
  const [preferredEditor, setPreferredEditor] = useState('')
  const [customCommand, setCustomCommand] = useState('')
  const [executorCommand, setExecutorCommand] = useState('claude')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.deck.settings.get().then((s) => {
      setPreferredEditor(s.preferredEditor ?? '')
      setCustomCommand(s.customEditorCommand ?? '')
      setExecutorCommand(s.defaultExecutorCommand)
      setReady(true)
    })
  }, [])

  function validate(): string | null {
    if (preferredEditor === 'custom') {
      if (!customCommand.trim()) return 'Enter a command for your custom editor.'
      if (METACHAR.test(customCommand))
        return 'Command contains invalid characters (; & | $ > < ` \\).'
    }
    if (!executorCommand.trim()) return 'Executor command is required.'
    return null
  }

  async function handleSave(): Promise<void> {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await window.deck.settings.set({
        preferredEditor: (preferredEditor as EditorPreset) || null,
        customEditorCommand: preferredEditor === 'custom' ? customCommand.trim() : null,
        defaultExecutorCommand: executorCommand.trim()
      })
      await onSaved()
      onClose()
    } catch {
      setError('Failed to save settings.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure Deck preferences.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 flex flex-col gap-6">
          {/* Editor section */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
              Editor
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Preferred editor
              </label>
              <div className="relative">
                <select
                  value={preferredEditor}
                  onChange={(e) => setPreferredEditor(e.target.value)}
                  disabled={!ready}
                  className="h-9 w-full appearance-none bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 pr-8 text-op-zinc-200 font-body text-[13px] outline-none transition-[border-color,box-shadow] duration-150 cursor-pointer focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">None</option>
                  <option value="zed">Zed</option>
                  <option value="cursor">Cursor</option>
                  <option value="vscode">VS Code</option>
                  <option value="custom">Custom…</option>
                </select>
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-op-zinc-500 pointer-events-none"
                />
              </div>
            </div>

            {preferredEditor === 'custom' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-[12px] font-medium text-op-zinc-400">
                  Editor command
                </label>
                <input
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
          </div>

          {/* Executor section */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
              Executor
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Default command
              </label>
              <input
                type="text"
                value={executorCommand}
                onChange={(e) => setExecutorCommand(e.target.value)}
                disabled={!ready}
                placeholder="claude"
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Command used when spawning new executor sessions.
              </p>
            </div>
          </div>

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
            onClick={handleSave}
            disabled={saving || !ready}
            className="h-9 px-4 bg-accent hover:bg-accent-bright rounded-[7px] font-body text-[13px] font-medium text-white transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
