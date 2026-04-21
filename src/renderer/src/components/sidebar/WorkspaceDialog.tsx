import { useState, useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import type { Workspace } from '../../../../shared/ipc'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/Dialog'

const PRESET_COLORS = [
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Violet', value: '#8b5cf6' }
] as const

const HEX6 = /^#[0-9a-fA-F]{6}$/

interface WorkspaceDialogProps {
  mode: 'create' | 'edit'
  workspace?: Workspace
  onClose: () => void
}

export function WorkspaceDialog({
  mode,
  workspace,
  onClose
}: WorkspaceDialogProps): React.JSX.Element {
  const [name, setName] = useState(workspace?.name ?? '')
  const [path, setPath] = useState(workspace?.path ?? '')
  const [accentColor, setAccentColor] = useState(workspace?.accentColor ?? '#06b6d4')
  const [hexInput, setHexInput] = useState(workspace?.accentColor ?? '#06b6d4')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHexInput(accentColor)
  }, [accentColor])

  async function handlePickFolder(): Promise<void> {
    const picked = await window.deck.dialog.pickFolder()
    if (picked) setPath(picked)
  }

  function handleHexChange(v: string): void {
    setHexInput(v)
    if (HEX6.test(v)) setAccentColor(v)
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (!path.trim()) return 'Path is required.'
    if (!HEX6.test(accentColor)) return 'Color must be a valid hex code (e.g. #06b6d4).'
    return null
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await window.deck.workspace.create({ name: name.trim(), path: path.trim(), accentColor })
      } else if (workspace) {
        await window.deck.workspace.update({
          id: workspace.id,
          patch: { name: name.trim(), path: path.trim(), accentColor }
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'New Workspace' : 'Edit Workspace'}</DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Create a new workspace with a name, folder path, and accent color.'
                : 'Modify workspace name, path, or accent color.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2 flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-body text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
              />
            </div>

            {/* Path */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/Users/you/Projects/MyWorkspace"
                  className="flex-1 h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[12px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                />
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="flex items-center gap-1.5 h-9 px-3 bg-op-zinc-800 hover:bg-op-zinc-700 border border-op-zinc-700 rounded-[7px] text-op-zinc-300 font-body text-[12px] font-medium transition-colors duration-100 flex-shrink-0"
                >
                  <FolderOpen size={13} strokeWidth={1.75} />
                  Browse…
                </button>
              </div>
            </div>

            {/* Accent color */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">Color</label>
              <div className="flex items-center gap-3">
                {PRESET_COLORS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() => setAccentColor(value)}
                    className={[
                      'w-7 h-7 rounded-full flex-shrink-0 transition-all duration-100',
                      accentColor === value
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-op-surface-2 scale-110'
                        : 'opacity-60 hover:opacity-100'
                    ].join(' ')}
                    style={{ backgroundColor: value }}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 border border-op-zinc-700"
                    style={{ backgroundColor: HEX6.test(accentColor) ? accentColor : '#444' }}
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#06b6d4"
                    maxLength={7}
                    className="w-24 h-7 bg-op-zinc-900 border border-op-zinc-800 rounded-[5px] px-2 text-op-zinc-200 font-mono text-[12px] outline-none transition-[border-color] duration-100 placeholder:text-op-zinc-600 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
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
              type="submit"
              disabled={submitting}
              className="h-9 px-4 bg-accent hover:bg-accent-bright rounded-[7px] font-body text-[13px] font-medium text-white transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
