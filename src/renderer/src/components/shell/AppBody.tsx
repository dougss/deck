interface AppBodyProps {
  children: React.ReactNode
}

export function AppBody({ children }: AppBodyProps): React.JSX.Element {
  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar placeholder — replaced by <Sidebar> in Task 8 */}
      {/* bg-op-surface = #09090b (same layer as base; border creates the separation) */}
      <div className="w-[280px] flex-shrink-0 bg-op-surface border-r border-op-border" />
      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Session header placeholder — replaced by <SessionHeader> in Task 9 */}
        <div className="h-[50px] flex-shrink-0 bg-op-surface-2 border-b border-op-border" />
        {children}
      </div>
    </div>
  )
}
