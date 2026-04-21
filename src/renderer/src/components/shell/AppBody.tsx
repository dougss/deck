import { Sidebar } from '../sidebar/Sidebar'
import { SessionHeader } from '../session/SessionHeader'

interface AppBodyProps {
  children: React.ReactNode
}

export function AppBody({ children }: AppBodyProps): React.JSX.Element {
  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <SessionHeader />
        {children}
      </div>
    </div>
  )
}
