import { useActiveSession, useActiveWorkspace, useGitInfo } from '@/stores/deck'
import { ConfigBadge, IconButton, type ConfigBadgeVariant } from '@/components/ui'
import { BranchSwitcher } from './BranchSwitcher'

function getConfigLabel(workspaceName: string): { label: string; variant: ConfigBadgeVariant } {
  if (workspaceName.toLowerCase().includes('leve')) {
    return { label: 'claude-levesaude', variant: 'cyan' }
  }
  return { label: 'claude-max', variant: 'violet' }
}

export function SessionHeader(): React.JSX.Element {
  const session = useActiveSession()
  const workspace = useActiveWorkspace()
  const gitInfo = useGitInfo(session?.id ?? '')

  if (!session || !workspace) {
    return (
      <div className="h-[50px] flex-shrink-0 flex items-center px-5 bg-op-surface-2 border-b border-op-border">
        <span className="font-mono text-[13px] text-op-zinc-600">No session active</span>
      </div>
    )
  }

  const { label, variant } = getConfigLabel(workspace.name)

  return (
    <div className="h-[50px] flex-shrink-0 flex items-center justify-between px-5 gap-4 bg-op-surface-2 border-b border-op-border">
      {/* Left: breadcrumb + cwd stacked */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: workspace.accentColor,
              boxShadow: `0 0 6px ${workspace.accentColor}66`
            }}
            aria-hidden="true"
          />
          <span
            className="font-body text-[12px] font-medium flex-shrink-0"
            style={{ color: workspace.accentColor }}
          >
            {workspace.name}
          </span>
          <span className="text-op-zinc-700 font-mono text-[12px] flex-shrink-0">/</span>
          <span
            className="font-display text-[14px] font-semibold text-op-zinc-50 truncate"
            style={{ letterSpacing: '-0.005em' }}
          >
            {session.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-[3px] font-mono text-[11px] text-op-zinc-500">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-op-zinc-600 flex-shrink-0"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="truncate">{session.cwd}</span>
        </div>
      </div>

      {/* Right: branch switcher + config badge + more button */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {gitInfo?.isRepo && (
          <BranchSwitcher
            sessionId={session.id}
            gitInfo={gitInfo}
            isIdle={session.status === 'idle'}
          />
        )}
        <ConfigBadge label={label} variant={variant} />
        <IconButton label="More options">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </IconButton>
      </div>
    </div>
  )
}
