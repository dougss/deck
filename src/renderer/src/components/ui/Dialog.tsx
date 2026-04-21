import * as RadixDialog from '@radix-ui/react-dialog'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

function DialogOverlay(
  props: React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
): React.JSX.Element {
  return (
    <RadixDialog.Overlay
      className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150"
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>): React.JSX.Element {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        className={[
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-[480px] max-w-[calc(100vw-32px)]',
          'bg-op-surface-2 border border-op-border rounded-xl',
          'shadow-2xl shadow-black/60',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-150',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogHeader({
  children,
  className
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={['px-6 pt-6 pb-4', className].filter(Boolean).join(' ')}>{children}</div>
}

export function DialogTitle({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>): React.JSX.Element {
  return (
    <RadixDialog.Title
      className={[
        'font-display text-[15px] font-semibold text-op-zinc-50 tracking-[-0.01em]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  )
}

export function DialogDescription({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>): React.JSX.Element {
  return (
    <RadixDialog.Description
      className={['mt-1 font-body text-[12px] text-op-zinc-500 leading-relaxed', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </RadixDialog.Description>
  )
}

export function DialogFooter({
  children,
  className
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={[
        'flex items-center justify-end gap-2 px-6 py-4 border-t border-op-border',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
