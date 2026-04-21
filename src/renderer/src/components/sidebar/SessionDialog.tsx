import { useState } from 'react'
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

interface SessionDialogProps {
  workspace: Workspace
  onClose: () => void
}

export function SessionDialog({ workspace, onClose }: SessionDialogProps): React.JSX.Element {
  const [name, setName] = useState(`${workspace.name}/new-session`)
  const [cwd, setCwd] = useState(workspace.path)
  const [subText, setSubText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePickFolder(): Promise<void> {
    const picked = await window.deck.dialog.pickFolder()
    if (picked) setCwd(picked)
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (name.trim().length > 60) return 'Name must be 60 characters or fewer.'
    if (!cwd.trim()) return 'Working directory is required.'
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
      const session = await window.deck.session.create({
        workspaceId: workspace.id,
        name: name.trim(),
        cwd: cwd.trim(),
        command: 'claude',
        subText: subText.trim()
      })
      onClose()
      // attach after dialog close — if it fails, session stays idle and user can click to retry
      window.deck.session.attach({ id: session.id }).catch((err) => {
        console.error('[Deck] Auto-attach after create failed:', err)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
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
            <DialogTitle>New Session</DialogTitle>
            <DialogDescription>
              Creating session in{' '}
              <span className="font-medium" style={{ color: workspace.accentColor }}>
                {workspace.name}
              </span>
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
                placeholder="workspace/session-name"
                maxLength={60}
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
              />
            </div>

            {/* Working directory */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Working Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="/Users/you/Projects/my-project"
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

            {/* Description (optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Description <span className="text-op-zinc-600 font-normal">— optional</span>
              </label>
              <input
                type="text"
                value={subText}
                onChange={(e) => setSubText(e.target.value)}
                placeholder="Brief description…"
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-body text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
              />
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
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
