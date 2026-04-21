import { Titlebar } from './Titlebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="flex flex-col h-full bg-op-base overflow-hidden">
      <Titlebar />
      {children}
    </div>
  )
}
