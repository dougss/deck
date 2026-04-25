export type StatusDotVariant = 'working' | 'awaiting' | 'idle' | 'pending' | 'error'

interface StatusDotProps {
  variant: StatusDotVariant
  /** sm = 6px (statusbar), md = 8px (session item) */
  size?: 'sm' | 'md'
}

const variantClasses: Record<StatusDotVariant, string> = {
  working:
    'bg-success animate-pulse-green shadow-[0_0_8px_rgba(74,222,128,0.4),0_0_0_3px_rgba(74,222,128,0.15)]',
  awaiting: 'bg-amber shadow-[0_0_6px_rgba(251,191,36,0.35),0_0_0_3px_rgba(251,191,36,0.15)]',
  idle: 'bg-op-zinc-600',
  pending: 'bg-amber animate-pulse-amber shadow-[0_0_0_3px_rgba(251,191,36,0.15)]',
  error: 'bg-danger animate-pulse-red shadow-[0_0_0_3px_rgba(248,113,113,0.15)]'
}

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2'
}

export function StatusDot({ variant, size = 'sm' }: StatusDotProps): React.JSX.Element {
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClasses[size]} ${variantClasses[variant]}`}
      aria-label={variant}
    />
  )
}
