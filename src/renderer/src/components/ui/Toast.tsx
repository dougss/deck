import { createContext, useCallback, useContext, useState } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  message: string
  type: 'info' | 'error' | 'confirm'
  actions?: ToastAction[]
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
}

type ToastFn = (opts: ToastOptions) => void

const ToastCtx = createContext<ToastFn | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { ...opts, id }])
      if (opts.type !== 'confirm') {
        setTimeout(() => dismiss(id), opts.duration ?? 3500)
      }
    },
    [dismiss]
  )

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastEntry key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastFn {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastEntry({
  item,
  onDismiss
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}): React.JSX.Element {
  const borderColor =
    item.type === 'error'
      ? 'border-danger/40'
      : item.type === 'confirm'
        ? 'border-amber/40'
        : 'border-op-border'

  const textColor =
    item.type === 'error'
      ? 'text-danger'
      : item.type === 'confirm'
        ? 'text-amber'
        : 'text-op-zinc-200'

  return (
    <div
      className={`pointer-events-auto min-w-[260px] max-w-[360px] rounded-lg border bg-op-surface-3 px-4 py-3 shadow-lg ${borderColor}`}
    >
      <p className={`font-body text-[13px] ${textColor}`}>{item.message}</p>
      {item.actions && item.actions.length > 0 && (
        <div className="mt-2.5 flex gap-2">
          {item.actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick()
                onDismiss(item.id)
              }}
              className={`rounded px-2.5 py-1 font-body text-[12px] font-medium transition-colors ${
                i === 0
                  ? 'bg-op-zinc-700 text-op-zinc-100 hover:bg-op-zinc-600'
                  : 'text-op-zinc-400 hover:text-op-zinc-200'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
