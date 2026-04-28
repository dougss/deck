import { useState } from 'react'
import { FolderOpen, Bot, Terminal, ChevronDown } from 'lucide-react'
import type { SessionType, Workspace } from '../../../../shared/ipc'
import { useDeckStore } from '@/stores/deck'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/Dialog'

const LAST_TYPE_KEY = 'deck:lastSessionType'

function getLastType(): SessionType {
  const stored = localStorage.getItem(LAST_TYPE_KEY)
  if (stored === 'shell' || stored === 'claude-code') return stored
  return 'claude-code'
}

function autoName(workspace: Workspace, type: SessionType): string {
  return type === 'shell' ? `${workspace.name}/shell` : `${workspace.name}/new-session`
}

interface SessionDialogProps {
  initialWorkspace: Workspace
  workspaces: Workspace[]
  defaultCommand?: string
  onClose: () => void
}

export function SessionDialog({
  initialWorkspace,
  workspaces,
  defaultCommand = 'claude',
  onClose
}: SessionDialogProps): React.JSX.Element {
  const setActive = useDeckStore((s) => s.setActive)

  const [type, setType] = useState<SessionType>(getLastType)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspace.id)
  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? initialWorkspace

  const [name, setName] = useState(() => autoName(initialWorkspace, getLastType()))
  const [nameDirty, setNameDirty] = useState(false)
  const [cwd, setCwd] = useState(initialWorkspace.path)
  const [cwdDirty, setCwdDirty] = useState(false)
  const [command, setCommand] = useState(defaultCommand)
  const [subText, setSubText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTypeChange(newType: SessionType): void {
    setType(newType)
    if (!nameDirty) setName(autoName(selectedWorkspace, newType))
  }

  function handleWorkspaceChange(wsId: string): void {
    const ws = workspaces.find((w) => w.id === wsId)
    if (!ws) return
    setSelectedWorkspaceId(wsId)
    if (!cwdDirty) setCwd(ws.path)
    if (!nameDirty) setName(autoName(ws, type))
  }

  async function handlePickFolder(): Promise<void> {
    const picked = await window.deck.dialog.pickFolder()
    if (picked) {
      setCwd(picked)
      setCwdDirty(true)
    }
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (name.trim().length > 60) return 'Name must be 60 characters or fewer.'
    if (!cwd.trim()) return 'Working directory is required.'
    if (type === 'claude-code' && !command.trim()) return 'Command is required.'
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
    localStorage.setItem(LAST_TYPE_KEY, type)
    try {
      const session = await window.deck.session.create({
        workspaceId: selectedWorkspace.id,
        name: name.trim(),
        cwd: cwd.trim(),
        command: type === 'shell' ? '' : command.trim(),
        subText: subText.trim(),
        type
      })
      onClose()
      setActive(session.id)
      window.deck.session.attach({ id: session.id }).catch((attachErr) => {
        console.error('[Deck] Auto-attach after create failed:', attachErr)
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
              <span className="font-medium" style={{ color: selectedWorkspace.accentColor }}>
                {selectedWorkspace.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2 flex flex-col gap-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {(['claude-code', 'shell'] as SessionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={[
                    'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[8px] border transition-all duration-150',
                    type === t
                      ? 'border-accent bg-accent/10 text-op-zinc-100'
                      : 'border-op-zinc-700 bg-op-zinc-900 text-op-zinc-400 hover:border-op-zinc-600 hover:text-op-zinc-300'
                  ].join(' ')}
                >
                  {t === 'claude-code' ? (
                    <Bot size={14} strokeWidth={1.75} />
                  ) : (
                    <Terminal size={14} strokeWidth={1.75} />
                  )}
                  <span className="font-body text-[12px] font-medium">
                    {t === 'claude-code' ? 'Claude Code' : 'Shell'}
                  </span>
                </button>
              ))}
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameDirty(true)
                }}
                placeholder="workspace/session-name"
                maxLength={60}
                className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
              />
            </div>

            {/* Workspace select */}
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Workspace
              </label>
              <div className="relative">
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => handleWorkspaceChange(e.target.value)}
                  className="w-full h-9 appearance-none bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 pr-8 text-op-zinc-200 font-body text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  strokeWidth={1.75}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-op-zinc-500"
                />
              </div>
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
                  onChange={(e) => {
                    setCwd(e.target.value)
                    setCwdDirty(true)
                  }}
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

            {/* Command (Claude Code only) */}
            {type === 'claude-code' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-body text-[12px] font-medium text-op-zinc-400">
                  Command
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="claude"
                  className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                />
              </div>
            )}

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
