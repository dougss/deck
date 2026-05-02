import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PanelHeaderProps {
  title: string
  context?: string
  statusOn?: boolean
  showMenu?: boolean
  onReset?: () => void
}

export function PanelHeader({
  title,
  context,
  statusOn = false,
  showMenu = false,
  onReset
}: PanelHeaderProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="flex items-center justify-between px-3.5 py-[11px] border-b border-op-border-soft shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            statusOn ? 'bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.18)]' : 'bg-op-zinc-600'
          )}
        />
        <span className="font-display font-semibold text-[13px] text-op-zinc-100 shrink-0">
          {title}
        </span>
        {context && (
          <span className="font-mono text-[11px] text-op-zinc-400 truncate">· {context}</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {showMenu && (
          <div ref={menuRef} className="relative">
            <button
              title="More"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-op-zinc-400 hover:text-op-zinc-200 hover:bg-op-surface-3 transition-colors duration-100"
            >
              <MoreHorizontal size={14} strokeWidth={1.6} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-50 w-40 bg-op-surface-2 border border-op-border rounded-md shadow-lg py-1 overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onReset?.()
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-op-zinc-300 hover:text-op-zinc-100 hover:bg-op-surface-3 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} strokeWidth={1.6} />
                  Reset terminal
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
