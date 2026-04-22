import { Sidebar } from '../sidebar/Sidebar'
import { SessionHeader } from '../session/SessionHeader'
import { ActivityBar } from '../sidebar-right/ActivityBar'
import { RightPanel } from '../sidebar-right/RightPanel'
import { useDeckStore } from '@/stores/deck'

interface AppBodyProps {
  children: React.ReactNode
}

export function AppBody({ children }: AppBodyProps): React.JSX.Element {
  const pinned = useDeckStore((s) => s.rightPanelPinned)
  const activePanel = useDeckStore((s) => s.activeRightPanel)
  const isPinned = pinned && activePanel !== null

  return (
    <div className="flex flex-1 min-h-0 relative overflow-hidden">
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          marginRight: isPinned ? '420px' : '0px',
          transition: 'margin-right 180ms ease'
        }}
      >
        <SessionHeader />
        {children}
      </div>
      <ActivityBar />
      <RightPanel />
    </div>
  )
}
