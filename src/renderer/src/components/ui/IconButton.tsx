import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      aria-label={label}
      className={`w-7 h-7 flex items-center justify-center rounded-md border-0 bg-transparent text-op-zinc-500 hover:text-op-zinc-200 hover:bg-op-zinc-900 transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
