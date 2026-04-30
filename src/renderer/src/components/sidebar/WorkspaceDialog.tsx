import { useState, useEffect } from 'react'
import { FolderOpen, ChevronDown, ChevronRight } from 'lucide-react'
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
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Lime', value: '#84cc16' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Rose', value: '#f43f5e' }
] as const

const HEX6 = /^#[0-9a-fA-F]{6}$/
const RECENT_KEY = 'deck:recentColors'
const RECENT_MAX = 5
const PRESET_SET = new Set<string>(PRESET_COLORS.map((p) => p.value))

const AVAILABLE_PLANNER_TOOLS = [
  'Bash',
  'Edit',
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

function tokenize(value: string): string[] {
  return value.split(/[\s,]+/).filter(Boolean)
}

interface ToolChipProps {
  name: string
  value: string
  onChange: (next: string) => void
}

function ToolChip({ name, value, onChange }: ToolChipProps): React.JSX.Element {
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
      className={
        active
          ? 'h-6 px-2 rounded-[5px] border border-accent bg-accent/15 text-op-zinc-100 font-mono text-[11px] cursor-pointer transition-colors duration-100'
          : 'h-6 px-2 rounded-[5px] border border-op-zinc-800 bg-op-zinc-900 text-op-zinc-400 hover:text-op-zinc-200 hover:border-op-zinc-700 font-mono text-[11px] cursor-pointer transition-colors duration-100'
      }
    >
      {name}
    </button>
  )
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed
          .filter((c): c is string => typeof c === 'string' && HEX6.test(c))
          .slice(0, RECENT_MAX)
      : []
  } catch {
    return []
  }
}

function pushRecent(color: string): string[] {
  const normalized = color.toLowerCase()
  if (PRESET_SET.has(normalized)) return loadRecent()
  const current = loadRecent()
  const next = [normalized, ...current.filter((c) => c.toLowerCase() !== normalized)].slice(
    0,
    RECENT_MAX
  )
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

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
  const [recent] = useState<string[]>(() => loadRecent())
  const [plannerPrompt, setPlannerPrompt] = useState(workspace?.plannerPrompt ?? '')
  const [plannerDisallowedTools, setPlannerDisallowedTools] = useState(
    workspace?.plannerDisallowedTools ?? ''
  )
  const [plannerAllowedTools, setPlannerAllowedTools] = useState(
    workspace?.plannerAllowedTools ?? ''
  )
  const [plannerExpanded, setPlannerExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHexInput(accentColor)
  }, [accentColor])

  async function handlePickFolder(): Promise<void> {
    const picked = await window.deck.dialog.pickFolder()
    if (picked) setPath(picked)
  }

  function handleHexChange(v: string): void {
    setHexInput(v)
    if (HEX6.test(v)) setAccentColor(v.toLowerCase())
  }

  function handleNativePicker(v: string): void {
    setAccentColor(v.toLowerCase())
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
    const plannerFields = {
      plannerPrompt: plannerPrompt.trim() || null,
      plannerDisallowedTools: plannerDisallowedTools.trim() || null,
      plannerAllowedTools: plannerAllowedTools.trim() || null
    }

    try {
      if (mode === 'create') {
        await window.deck.workspace.create({
          name: name.trim(),
          path: path.trim(),
          accentColor,
          ...plannerFields
        })
      } else if (workspace) {
        await window.deck.workspace.update({
          id: workspace.id,
          patch: { name: name.trim(), path: path.trim(), accentColor, ...plannerFields }
        })
      }
      pushRecent(accentColor)
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
            <div className="flex flex-col gap-2.5">
              <label className="font-body text-[12px] font-medium text-op-zinc-400">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map(({ label, value }) => {
                  const selected = accentColor.toLowerCase() === value
                  return (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={selected}
                      onClick={() => setAccentColor(value)}
                      className={[
                        'w-7 h-7 rounded-full flex-shrink-0 transition-all duration-100',
                        selected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-op-surface-2 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      ].join(' ')}
                      style={{ backgroundColor: value }}
                    />
                  )
                })}
              </div>

              {recent.length > 0 && (
                <>
                  <div className="h-px bg-op-zinc-800" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-[11px] text-op-zinc-500">Recent</span>
                    {recent.map((c) => {
                      const selected = accentColor.toLowerCase() === c
                      return (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          aria-label={`Recent color ${c}`}
                          aria-pressed={selected}
                          onClick={() => setAccentColor(c)}
                          className={[
                            'w-6 h-6 rounded-full flex-shrink-0 transition-all duration-100',
                            selected
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-op-surface-2 scale-110'
                              : 'opacity-70 hover:opacity-100'
                          ].join(' ')}
                          style={{ backgroundColor: c }}
                        />
                      )
                    })}
                  </div>
                </>
              )}

              <div className="h-px bg-op-zinc-800" />

              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 h-7 px-2.5 bg-op-zinc-800 hover:bg-op-zinc-700 border border-op-zinc-700 rounded-[6px] cursor-pointer transition-colors duration-100"
                  title="Pick a custom color"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{
                      background:
                        'conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #ec4899, #ef4444)'
                    }}
                  />
                  <span className="font-body text-[11px] font-medium text-op-zinc-300">
                    Custom…
                  </span>
                  <input
                    type="color"
                    value={HEX6.test(accentColor) ? accentColor : '#06b6d4'}
                    onChange={(e) => handleNativePicker(e.target.value)}
                    className="sr-only"
                  />
                </label>

                <div className="flex items-center gap-1.5">
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
                    aria-label="Hex color"
                    className="w-24 h-7 bg-op-zinc-900 border border-op-zinc-800 rounded-[5px] px-2 text-op-zinc-200 font-mono text-[12px] outline-none transition-[border-color] duration-100 placeholder:text-op-zinc-600 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Planner overrides */}
            <div className="flex flex-col gap-0">
              <button
                type="button"
                onClick={() => setPlannerExpanded((v) => !v)}
                className="flex items-center gap-1.5 py-1 text-left"
              >
                {plannerExpanded ? (
                  <ChevronDown size={13} strokeWidth={1.75} className="text-op-zinc-500" />
                ) : (
                  <ChevronRight size={13} strokeWidth={1.75} className="text-op-zinc-500" />
                )}
                <span className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
                  Planner overrides
                </span>
              </button>

              {plannerExpanded && (
                <div className="flex flex-col gap-3 mt-3 pl-4 border-l border-op-zinc-800">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-body text-[12px] font-medium text-op-zinc-400">
                      System prompt
                    </label>
                    <textarea
                      value={plannerPrompt}
                      onChange={(e) => setPlannerPrompt(e.target.value)}
                      placeholder="Leave empty to use global / built-in prompt."
                      rows={3}
                      className="bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 py-2 text-op-zinc-200 font-mono text-[12px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] resize-y"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-body text-[12px] font-medium text-op-zinc-400">
                      Disallowed tools
                    </label>
                    <input
                      type="text"
                      value={plannerDisallowedTools}
                      onChange={(e) => setPlannerDisallowedTools(e.target.value)}
                      placeholder="Empty = use global setting"
                      className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {AVAILABLE_PLANNER_TOOLS.map((tool) => (
                        <ToolChip
                          key={`ws-dis-${tool}`}
                          name={tool}
                          value={plannerDisallowedTools}
                          onChange={setPlannerDisallowedTools}
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
                      value={plannerAllowedTools}
                      onChange={(e) => setPlannerAllowedTools(e.target.value)}
                      placeholder="Empty = use global setting"
                      className="h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] px-3 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-600 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {AVAILABLE_PLANNER_TOOLS.map((tool) => (
                        <ToolChip
                          key={`ws-allow-${tool}`}
                          name={tool}
                          value={plannerAllowedTools}
                          onChange={setPlannerAllowedTools}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
