import { ChevronRight } from 'lucide-react'
import * as RadixContextMenu from '@radix-ui/react-context-menu'

export const ContextMenu = RadixContextMenu.Root
export const ContextMenuTrigger = RadixContextMenu.Trigger

export function ContextMenuContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixContextMenu.Content>): React.JSX.Element {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.Content
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
      </RadixContextMenu.Content>
    </RadixContextMenu.Portal>
  )
}

export function ContextMenuItem({
  children,
  className,
  destructive,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixContextMenu.Item> & {
  destructive?: boolean
}): React.JSX.Element {
  return (
    <RadixContextMenu.Item
      className={[
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'font-body text-[13px] cursor-pointer outline-none select-none',
        'transition-colors duration-75',
        destructive
          ? 'text-red-400 data-[highlighted]:bg-red-900/25 data-[highlighted]:text-red-300'
          : 'text-op-zinc-200 data-[highlighted]:bg-op-zinc-800 data-[highlighted]:text-op-zinc-50',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </RadixContextMenu.Item>
  )
}

export const ContextMenuSub = RadixContextMenu.Sub

export function ContextMenuSubTrigger({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixContextMenu.SubTrigger>): React.JSX.Element {
  return (
    <RadixContextMenu.SubTrigger
      className={[
        'flex items-center justify-between gap-2 px-3 py-1.5 rounded-md',
        'font-body text-[13px] cursor-pointer outline-none select-none',
        'transition-colors duration-75',
        'text-op-zinc-200 data-[highlighted]:bg-op-zinc-800 data-[highlighted]:text-op-zinc-50',
        'data-[state=open]:bg-op-zinc-800 data-[state=open]:text-op-zinc-50',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
      <ChevronRight size={12} strokeWidth={1.75} className="text-op-zinc-500" />
    </RadixContextMenu.SubTrigger>
  )
}

export function ContextMenuSubContent({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixContextMenu.SubContent>): React.JSX.Element {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.SubContent
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
      </RadixContextMenu.SubContent>
    </RadixContextMenu.Portal>
  )
}

export function ContextMenuSeparator(
  props: React.ComponentPropsWithoutRef<typeof RadixContextMenu.Separator>
): React.JSX.Element {
  return <RadixContextMenu.Separator className="h-px my-1 bg-op-border" {...props} />
}
