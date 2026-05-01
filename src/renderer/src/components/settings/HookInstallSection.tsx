import { useState, useEffect, useCallback } from 'react'
import type { HookInstanceStatus } from '../../../../shared/ipc'

const STATUS_LABEL: Record<string, string> = {
  installed: 'Installed',
  'not-installed': 'Not installed',
  partial: 'Partial',
  'not-found': 'Not found'
}

const STATUS_COLOR: Record<string, string> = {
  installed: 'text-success',
  'not-installed': 'text-op-zinc-500',
  partial: 'text-amber',
  'not-found': 'text-op-zinc-600'
}

export function HookInstallSection(): React.JSX.Element {
  const [instances, setInstances] = useState<HookInstanceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const status = await window.deck.hooks.getStatus()
      setInstances(status)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function handleInstall(): Promise<void> {
    setWorking(true)
    try {
      const result = await window.deck.hooks.install()
      setInstances(result)
    } finally {
      setWorking(false)
    }
  }

  async function handleUninstall(): Promise<void> {
    setWorking(true)
    try {
      const result = await window.deck.hooks.uninstall()
      setInstances(result)
    } finally {
      setWorking(false)
    }
  }

  const allInstalled = instances.length > 0 && instances.every((i) => i.status === 'installed')
  const noneFound = instances.length === 0 && !loading

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[11px] font-semibold tracking-[0.08em] uppercase text-op-zinc-500">
        Notifications
      </p>

      <p className="font-body text-[12px] text-op-zinc-400 leading-relaxed">
        Show a pulsing dot when Claude Code completes in a background session.
      </p>

      {loading ? (
        <p className="font-body text-[12px] text-op-zinc-600">Detecting instances…</p>
      ) : noneFound ? (
        <p className="font-body text-[12px] text-op-zinc-600">
          No Claude Code instances found (expected ~/.claude or ~/.claude-*).
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="font-body text-[11px] font-medium text-op-zinc-500">
            Detected Claude Code instances:
          </p>
          <div className="flex flex-col gap-1 rounded-[7px] bg-op-zinc-900 border border-op-zinc-800 px-3 py-2">
            {instances.map((inst) => (
              <div key={inst.path} className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-op-zinc-400 truncate">
                  {inst.path.replace(new RegExp(`^${window.deck.env.home}`), '~')}
                </span>
                <span
                  className={`font-body text-[11px] flex-shrink-0 ${STATUS_COLOR[inst.status] ?? 'text-op-zinc-500'}`}
                >
                  {STATUS_LABEL[inst.status] ?? inst.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!noneFound && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            disabled={working || loading || allInstalled}
            className="h-8 px-3 bg-op-zinc-800 hover:bg-op-zinc-700 rounded-[7px] font-body text-[12px] font-medium text-op-zinc-200 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {working ? 'Working…' : 'Install hooks'}
          </button>
          <button
            type="button"
            onClick={handleUninstall}
            disabled={working || loading}
            className="h-8 px-3 bg-op-zinc-800 hover:bg-op-zinc-700 rounded-[7px] font-body text-[12px] font-medium text-op-zinc-500 hover:text-op-zinc-300 transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Uninstall
          </button>
        </div>
      )}

      <p className="font-body text-[11px] text-op-zinc-600">
        ⓘ Optional: install jq for faster parsing (
        <span className="font-mono">brew install jq</span>). Python3 is used as fallback.
      </p>
    </div>
  )
}
