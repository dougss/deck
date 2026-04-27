import { useState, useEffect } from 'react'
import { HookInstallSection } from './HookInstallSection'
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
  const [customCommand, setCustomCommand] = useState('')
  const [executorCommand, setExecutorCommand] = useState('claude')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.deck.settings.get().then((s) => {
      setCustomCommand(s.customEditorCommand ?? '')
      setExecutorCommand(s.defaultExecutorCommand)
      setReady(true)
    })
  }, [])

  function validate(): string | null {
    if (customCommand.trim() && METACHAR.test(customCommand))
      return 'Command contains invalid characters (; & | $ > < ` \\).'
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
        customEditorCommand: customCommand.trim() || null,
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
                Custom editor command
              </label>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                disabled={!ready}
                placeholder="e.g. my-editor"
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Binary name or path used for "Open in Custom". Workspace path is appended
                automatically.
              </p>
            </div>
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

          {/* Notifications section */}
          <HookInstallSection />

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
