import { GitPullRequest } from 'lucide-react'

type Variant = 'no-session' | 'not-repo' | 'no-changes' | 'ssh' | 'loading'

interface DiffEmptyStateProps {
  variant: Variant
}

const COPY: Record<Variant, { title: string; body: string }> = {
  'no-session': {
    title: 'No session selected',
    body: 'Pick a session in the sidebar to see its working tree changes.'
  },
  'not-repo': {
    title: 'Not a git repository',
    body: 'This session’s working directory is not inside a git repo.'
  },
  'no-changes': {
    title: 'No changes',
    body: 'Working tree is clean. Edit files to see them appear here.'
  },
  ssh: {
    title: 'Not available for SSH sessions',
    body: 'Diff is only computed for local sessions.'
  },
  loading: {
    title: 'Loading…',
    body: 'Reading working tree.'
  }
}

export function DiffEmptyState({ variant }: DiffEmptyStateProps): React.JSX.Element {
  const { title, body } = COPY[variant]
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-7 py-8 gap-4">
      <div className="flex items-center justify-center w-11 h-11 rounded-[10px] bg-op-surface-2 border border-op-border text-op-zinc-400 shrink-0">
        <GitPullRequest size={22} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display font-semibold text-sm text-op-zinc-100 m-0">{title}</h3>
        <p className="text-op-zinc-400 text-xs leading-relaxed max-w-[280px] m-0">{body}</p>
      </div>
    </div>
  )
}
