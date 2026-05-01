import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu'

export const DropdownMenu = RadixDropdownMenu.Root
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger
export const DropdownMenuPortal = RadixDropdownMenu.Portal

export function DropdownMenuContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Content>): React.JSX.Element {
  return (
    <DropdownMenuPortal>
      <RadixDropdownMenu.Content
        className={[
          'z-50 min-w-[160px] overflow-hidden',
          'bg-op-surface-3 border border-op-border rounded-lg',
          'shadow-xl shadow-black/50 p-1',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-100',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </RadixDropdownMenu.Content>
    </DropdownMenuPortal>
  )
}

export function DropdownMenuItem({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Item>): React.JSX.Element {
  return (
    <RadixDropdownMenu.Item
      className={[
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'font-body text-[13px] cursor-pointer outline-none select-none',
        'transition-colors duration-75',
        'text-op-zinc-200 data-[highlighted]:bg-op-zinc-800 data-[highlighted]:text-op-zinc-50',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </RadixDropdownMenu.Item>
  )
}

export function DropdownMenuSeparator(
  props: React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Separator>
): React.JSX.Element {
  return <RadixDropdownMenu.Separator className="h-px my-1 bg-op-border" {...props} />
}
