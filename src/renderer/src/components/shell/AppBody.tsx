import { Sidebar } from '../sidebar/Sidebar'

interface AppBodyProps {
  children: React.ReactNode
}

export function AppBody({ children }: AppBodyProps): React.JSX.Element {
  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar />
      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Session header placeholder — replaced by <SessionHeader> in Task 9 */}
        <div className="h-[50px] flex-shrink-0 bg-op-surface-2 border-b border-op-border" />
        {children}
      </div>
    </div>
  )
}
