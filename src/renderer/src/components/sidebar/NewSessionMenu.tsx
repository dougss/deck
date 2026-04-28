import { useRef, useState, useEffect } from 'react'
import { Plus, Terminal, Bot } from 'lucide-react'
import type { SessionType, Workspace } from '../../../../shared/ipc'

interface NewSessionMenuProps {
  workspace: Workspace
  onSelect: (workspace: Workspace, type: SessionType) => void
}

export function NewSessionMenu({ workspace, onSelect }: NewSessionMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent): void {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  function handleSelect(type: SessionType): void {
    setOpen(false)
    onSelect(workspace, type)
  }

  const disabled = workspace.needsSetup

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? "Workspace path doesn't exist. Edit workspace first." : undefined}
        className="flex items-center gap-1.5 ml-1.5 mt-0.5 px-2.5 py-1.5 rounded-[5px] font-body text-[11px] font-medium text-op-zinc-600 hover:text-op-zinc-400 hover:bg-op-zinc-900 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-op-zinc-600"
      >
        <Plus size={10} strokeWidth={2} />
        New session
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] bg-op-surface-2 border border-op-border rounded-[8px] shadow-lg py-1 overflow-hidden">
          <button
            onClick={() => handleSelect('claude-code')}
            className="w-full flex items-center gap-2.5 px-3 py-2 font-body text-[12px] text-op-zinc-300 hover:text-op-zinc-100 hover:bg-op-zinc-800 transition-colors duration-100 text-left"
          >
            <Bot size={13} strokeWidth={1.75} className="text-op-zinc-500 flex-shrink-0" />
            Claude Code
          </button>
          <button
            onClick={() => handleSelect('shell')}
            className="w-full flex items-center gap-2.5 px-3 py-2 font-body text-[12px] text-op-zinc-300 hover:text-op-zinc-100 hover:bg-op-zinc-800 transition-colors duration-100 text-left"
          >
            <Terminal size={13} strokeWidth={1.75} className="text-op-zinc-500 flex-shrink-0" />
            Shell
          </button>
        </div>
      )}
    </div>
  )
}
