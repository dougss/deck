import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-bright text-white hover:bg-accent active:bg-accent-bright/90',
  secondary: 'bg-op-zinc-700 text-op-zinc-200 hover:bg-op-zinc-600 active:bg-op-zinc-700',
  outline:
    'border border-op-border bg-transparent hover:bg-op-zinc-800 text-op-zinc-200 active:bg-op-zinc-900',
  ghost: 'bg-transparent hover:bg-op-zinc-800 text-op-zinc-200 active:bg-op-zinc-900',
  link: 'bg-transparent text-accent-bright underline-offset-2 hover:underline'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
  lg: 'h-9 px-4 text-[14px]'
}

export function Button({
  children,
  className = '',
  variant = 'secondary',
  size = 'md',
  ...props
}: ButtonProps): React.JSX.Element {
  const buttonClasses = [
    'inline-flex items-center justify-center gap-2',
    'font-body font-medium rounded-md',
    'transition-colors duration-75 outline-none',
    'focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
    variantClasses[variant],
    sizeClasses[size],
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  )
}

export type { ButtonProps, ButtonVariant, ButtonSize }
