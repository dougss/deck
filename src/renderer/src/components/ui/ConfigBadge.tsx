export type ConfigBadgeVariant = 'violet' | 'cyan' | 'neutral'

interface ConfigBadgeProps {
  label: string
  variant: ConfigBadgeVariant
}

const variantConfig: Record<
  ConfigBadgeVariant,
  { textColor: string; bg: string; border: string; dotColor: string; dotGlow: string }
> = {
  violet: {
    textColor: '#c4b5fd',
    bg: 'rgba(124,58,237,0.15)',
    border: 'rgba(124,58,237,0.35)',
    dotColor: '#8b5cf6',
    dotGlow: 'rgba(139,92,246,0.6)'
  },
  cyan: {
    textColor: '#67e8f9',
    bg: 'rgba(6,182,212,0.15)',
    border: 'rgba(6,182,212,0.35)',
    dotColor: '#06b6d4',
    dotGlow: 'rgba(6,182,212,0.6)'
  },
  neutral: {
    textColor: '#a1a1aa',
    bg: 'rgba(39,39,42,0.5)',
    border: '#3f3f46',
    dotColor: '#71717a',
    dotGlow: 'transparent'
  }
}

export function ConfigBadge({ label, variant }: ConfigBadgeProps): React.JSX.Element {
  const cfg = variantConfig[variant]
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium px-2 py-[3px] rounded-[5px] border"
      style={{ color: cfg.textColor, background: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ background: cfg.dotColor, boxShadow: `0 0 6px ${cfg.dotGlow}` }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
