import { ChevronRight, Folder, AlertCircle } from 'lucide-react'
import type { Workspace } from '../../../../shared/ipc'

interface WorkspaceRowProps {
  workspace: Workspace
  isExpanded: boolean
  sessionCount: number
  onToggle: () => void
}

export function WorkspaceRow({
  workspace,
  isExpanded,
  sessionCount,
  onToggle
}: WorkspaceRowProps): React.JSX.Element {
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      className="flex items-center gap-2 h-8 px-2 rounded-[6px] cursor-pointer transition-colors duration-150 hover:bg-op-zinc-900"
    >
      <span
        className={`text-op-zinc-500 flex flex-shrink-0 transition-transform duration-150 ${
          isExpanded ? 'rotate-90' : ''
        }`}
      >
        <ChevronRight size={12} />
      </span>
      <span className="flex flex-shrink-0">
        <Folder size={15} strokeWidth={1.75} color={workspace.accentColor} />
      </span>
      <span className="font-body text-[14px] font-medium text-op-zinc-200 flex-1 min-w-0 truncate">
        {workspace.name}
      </span>
      {workspace.needsSetup && (
        <span
          className="flex-shrink-0 flex text-amber"
          title="Workspace path doesn't exist. Edit workspace first."
        >
          <AlertCircle size={12} />
        </span>
      )}
      <span className="font-mono text-[11px] text-op-zinc-600 px-1.5 py-px rounded-[4px] bg-white/[0.02] flex-shrink-0">
        {sessionCount}
      </span>
    </div>
  )
}
