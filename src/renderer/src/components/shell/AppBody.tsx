import { useRef, useState, useCallback, useEffect } from 'react'
import { ResizablePanel } from '../ResizablePanel'
import { Sidebar } from '../sidebar/Sidebar'
import { SessionHeader } from '../session/SessionHeader'
import { ActivityBar } from '../sidebar-right/ActivityBar'
import { RightPanel } from '../sidebar-right/RightPanel'
import { useDeckStore } from '@/stores/deck'

const RP_STORAGE_KEY = 'deck:rightPanelWidth'
const RP_DEFAULT = 420
const RP_MIN = 300

function loadRpWidth(): number {
  const s = localStorage.getItem(RP_STORAGE_KEY)
  if (!s) return RP_DEFAULT
  const parsed = parseInt(s, 10)
  return isNaN(parsed) ? RP_DEFAULT : Math.max(RP_MIN, parsed)
}

interface AppBodyProps {
  children: React.ReactNode
}

export function AppBody({ children }: AppBodyProps): React.JSX.Element {
  const pinned = useDeckStore((s) => s.rightPanelPinned)
  const activePanel = useDeckStore((s) => s.activeRightPanel)
  const isPinned = pinned && activePanel !== null
  const isPinnedRef = useRef(isPinned)
  useEffect(() => {
    isPinnedRef.current = isPinned
  }, [isPinned])

  // Once the right panel has been opened, keep it mounted so PTYs/xterm
  // instances inside (UtilityTerminal, PlannerTerminalHost) survive close/open.
  // Visibility is then toggled via CSS instead of unmount.
  const [hasOpenedRightPanel, setHasOpenedRightPanel] = useState(false)
  if (activePanel !== null && !hasOpenedRightPanel) {
    setHasOpenedRightPanel(true)
  }

  const [rpWidth, setRpWidth] = useState<number>(loadRpWidth)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Fires during drag — update marginRight directly on DOM (zero re-renders)
  const handleRpWidthChange = useCallback((w: number): void => {
    if (isPinnedRef.current && mainContentRef.current) {
      mainContentRef.current.style.marginRight = `${w}px`
    }
  }, [])

  // Fires on mouseup — commit to React state so subsequent renders are correct
  const handleRpWidthCommit = useCallback((w: number): void => {
    setRpWidth(w)
  }, [])

  return (
    <div className="flex flex-1 min-h-0 relative overflow-hidden">
      <ResizablePanel
        side="left"
        storageKey="deck:sidebarWidth"
        defaultWidth={280}
        minWidth={200}
        className="relative flex-shrink-0 h-full"
      >
        <Sidebar />
      </ResizablePanel>
      <div
        ref={mainContentRef}
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          marginRight: isPinned ? `${rpWidth}px` : '0px',
          transition: 'margin-right 180ms ease'
        }}
      >
        <SessionHeader />
        {children}
      </div>
      <ActivityBar />
      {hasOpenedRightPanel && (
        <ResizablePanel
          side="right"
          storageKey={RP_STORAGE_KEY}
          defaultWidth={RP_DEFAULT}
          minWidth={RP_MIN}
          onWidthChange={handleRpWidthChange}
          onWidthCommit={handleRpWidthCommit}
          className="absolute top-0 bottom-8 right-12 z-10"
          hidden={activePanel === null}
        >
          <RightPanel />
        </ResizablePanel>
      )}
    </div>
  )
}
