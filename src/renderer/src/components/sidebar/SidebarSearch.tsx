import { useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useSearchQuery, useDeckStore } from '@/stores/deck'
import { Kbd } from '@/components/ui/Kbd'

export function SidebarSearch(): React.JSX.Element {
  const query = useSearchQuery()
  const setSearch = useDeckStore((s) => s.setSearch)
  const focusSearchTick = useDeckStore((s) => s.focusSearchTick)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusSearchTick === 0) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusSearchTick])

  return (
    <div className="px-3 py-3 flex-shrink-0">
      <div className="relative h-9">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-op-zinc-500 pointer-events-none flex">
          <Search size={14} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions…"
          aria-label="Search sessions"
          className="w-full h-9 bg-op-zinc-900 border border-op-zinc-800 rounded-[7px] pl-8 pr-14 text-op-zinc-200 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-op-zinc-500 focus:border-accent focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Kbd>⌘F</Kbd>
        </span>
      </div>
    </div>
  )
}
