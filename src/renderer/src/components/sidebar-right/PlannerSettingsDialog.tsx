import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/Dialog'

const AVAILABLE_TOOLS = [
  'Bash',
  'Edit',
  'MultiEdit',
  'Write',
  'Read',
  'Grep',
  'Glob',
  'WebFetch',
  'WebSearch',
  'Task',
  'TodoWrite',
  'NotebookEdit'
] as const

interface PlannerSettingsDialogProps {
  onClose: () => void
}

export function PlannerSettingsDialog({ onClose }: PlannerSettingsDialogProps): React.JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [disallowedTools, setDisallowedTools] = useState('')
  const [allowedTools, setAllowedTools] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.deck.settings.get().then((s) => {
      setPrompt(s.plannerPrompt ?? '')
      setDisallowedTools(s.plannerDisallowedTools ?? '')
      setAllowedTools(s.plannerAllowedTools ?? '')
      setReady(true)
    })
  }, [])

  function handleReset(): void {
    setPrompt('')
    setDisallowedTools('')
    setAllowedTools('')
  }

  async function handleSave(): Promise<void> {
    setError(null)
    setSaving(true)
    try {
      await window.deck.settings.set({
        plannerPrompt: prompt.trim() || null,
        plannerDisallowedTools: disallowedTools.trim() || null,
        plannerAllowedTools: allowedTools.trim() || null
      })
      onClose()
    } catch {
      setError('Failed to save planner settings.')
      setSaving(false)
    }
  }

  const inputClass =
    'h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planner Settings</DialogTitle>
          <DialogDescription>
            Configure the system prompt and tool permissions for planner sessions. Workspace
            overrides take priority over these defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 flex flex-col gap-6">
          {/* System prompt */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
              System prompt
            </p>
            <div className="flex flex-col gap-1.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!ready}
                placeholder="Leave empty to use the built-in planner prompt."
                rows={8}
                className="bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 py-2 text-op-zinc-200 font-mono text-[12px] leading-[1.55] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-50 disabled:cursor-not-allowed resize-y"
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Appended to the default Claude system prompt for every planner session.
              </p>
            </div>
          </div>

          {/* Tool permissions */}
          <div className="flex flex-col gap-3">
            <p className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
              Tool permissions
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Disallowed tools
              </label>
              <input
                type="text"
                value={disallowedTools}
                onChange={(e) => setDisallowedTools(e.target.value)}
                disabled={!ready}
                placeholder="Empty = nothing blocked"
                className={inputClass}
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Space-separated tools to block. Click a chip to toggle:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {AVAILABLE_TOOLS.map((tool) => (
                  <ToolChip
                    key={`dis-${tool}`}
                    name={tool}
                    value={disallowedTools}
                    onChange={setDisallowedTools}
                    disabled={!ready}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">
                Allowed tools
              </label>
              <input
                type="text"
                value={allowedTools}
                onChange={(e) => setAllowedTools(e.target.value)}
                disabled={!ready}
                placeholder="Empty = all tools allowed"
                className={inputClass}
              />
              <p className="font-body text-[11px] text-op-zinc-500">
                Space-separated allowlist. When set, only these tools are available.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {AVAILABLE_TOOLS.map((tool) => (
                  <ToolChip
                    key={`allow-${tool}`}
                    name={tool}
                    value={allowedTools}
                    onChange={setAllowedTools}
                    disabled={!ready}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && <p className="font-body text-[12px] text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleReset}
            disabled={!ready}
            className="mr-auto flex items-center gap-1.5 h-9 px-3 text-op-zinc-400 hover:text-op-zinc-200 font-body text-[12px] font-medium transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={12} strokeWidth={1.75} />
            Reset to defaults
          </button>
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

function tokenize(value: string): string[] {
  return value.split(/[\s,]+/).filter(Boolean)
}

interface ToolChipProps {
  name: string
  value: string
  onChange: (next: string) => void
  disabled: boolean
}

function ToolChip({ name, value, onChange, disabled }: ToolChipProps): React.JSX.Element {
  const tokens = tokenize(value)
  const active = tokens.includes(name)
  const handleClick = (): void => {
    const next = active ? tokens.filter((t) => t !== name) : [...tokens, name]
    onChange(next.join(' '))
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={
        active
          ? 'h-6 px-2 rounded-[5px] border border-accent bg-accent/15 text-op-zinc-100 font-mono text-[11px] cursor-pointer transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed'
          : 'h-6 px-2 rounded-[5px] border border-op-zinc-800 bg-op-zinc-900 text-op-zinc-400 hover:text-op-zinc-200 hover:border-op-zinc-700 font-mono text-[11px] cursor-pointer transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      {name}
    </button>
  )
}
