import { useState } from 'react'
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

interface DeleteWorkspaceDialogProps {
  workspace: Workspace
  sessionCount: number
  onClose: () => void
}

export function DeleteWorkspaceDialog({
  workspace,
  sessionCount,
  onClose
}: DeleteWorkspaceDialogProps): React.JSX.Element {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      await window.deck.workspace.delete(workspace.id)
      onClose()
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{workspace.name}&rdquo;?</DialogTitle>
          <DialogDescription>
            Confirm workspace deletion. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          {sessionCount > 0 ? (
            <p className="font-body text-[13px] text-op-zinc-400 leading-relaxed">
              This will permanently delete{' '}
              <span className="text-op-zinc-200 font-medium">
                {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
              </span>{' '}
              in this workspace. Any active terminals will be terminated.
            </p>
          ) : (
            <p className="font-body text-[13px] text-op-zinc-400 leading-relaxed">
              This workspace will be permanently deleted. This action cannot be undone.
            </p>
          )}
          {error && <p className="mt-3 font-body text-[12px] text-red-400">{error}</p>}
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
            onClick={handleDelete}
            disabled={submitting}
            className="h-9 px-4 bg-red-900/40 hover:bg-red-900/60 border border-red-800/50 rounded-[7px] font-body text-[13px] font-medium text-red-400 hover:text-red-300 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
