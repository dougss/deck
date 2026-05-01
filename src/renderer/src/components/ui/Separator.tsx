import type { HTMLAttributes } from 'react'

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({
  orientation = 'horizontal',
  className = '',
  ...props
}: SeparatorProps): React.JSX.Element {
  const classes = [
    'shrink-0',
    orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    'bg-op-border',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={classes} {...props} />
}
