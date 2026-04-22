import { useEffect, useRef, useState } from 'react'
import { useDeckStore } from '@/stores/deck'
import { PanelHeader } from './PanelHeader'
import { PlannerEmptyState } from './PlannerEmptyState'
import { UtilityTerminal } from './UtilityTerminal'

function basename(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? filePath
}

function shellName(shellPath: string): string {
  return basename(shellPath)
}

export function RightPanel(): React.JSX.Element {
  const activePanel = useDeckStore((s) => s.activeRightPanel)
  const pinned = useDeckStore((s) => s.rightPanelPinned)

  const [spawnedCwd, setSpawnedCwd] = useState('')
  const [pid, setPid] = useState<number | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const hasOpenedTerminalRef = useRef(false)

  // Capture cwd once on first terminal open (frozen at spawn)
  useEffect(() => {
    if (activePanel === 'terminal' && !hasOpenedTerminalRef.current) {
      hasOpenedTerminalRef.current = true
      const state = useDeckStore.getState()
      const activeSession = state.activeSessionId
        ? state.sessions.find((s) => s.id === state.activeSessionId)
        : null
      const workspace = activeSession
        ? state.workspaces.find((w) => w.id === activeSession.workspaceId)
        : null
      setSpawnedCwd(workspace?.path ?? window.deck.env.home)
    }
  }, [activePanel])

  const isPanelOpen = activePanel !== null
  const isOverlay = !pinned

  const terminalContext = spawnedCwd ? basename(spawnedCwd) : ''
  const activeWorkspaceName = useDeckStore((s) => {
    const sess = s.activeSessionId ? s.sessions.find((x) => x.id === s.activeSessionId) : null
    return sess ? (s.workspaces.find((w) => w.id === sess.workspaceId)?.name ?? '') : ''
  })

  return (
    <div
      className="absolute top-0 bottom-0 right-12 w-[420px] bg-op-surface-1 border-l border-op-border flex flex-col z-10"
      style={{
        display: isPanelOpen ? 'flex' : 'none',
        boxShadow: isOverlay
          ? '-14px 0 36px -8px rgba(0,0,0,0.5), -2px 0 0 0 var(--op-border)'
          : 'none'
      }}
    >
      {activePanel === 'planner' ? (
        <PanelHeader title="Planner" context={activeWorkspaceName || undefined} statusOn={false} />
      ) : (
        <PanelHeader
          title="Terminal"
          context={terminalContext || undefined}
          statusOn={pid !== null}
          showMenu
          onReset={() => {
            setPid(null)
            setResetKey((k) => k + 1)
          }}
        />
      )}

      <div className="flex-1 min-h-0 relative">
        {/* Planner */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ display: activePanel === 'planner' ? 'flex' : 'none' }}
        >
          <PlannerEmptyState />
        </div>

        {/* Utility terminal — mounts once, never unmounts after first open */}
        {spawnedCwd !== '' && (
          <UtilityTerminal
            key={resetKey}
            cwd={spawnedCwd}
            visible={activePanel === 'terminal'}
            onPidChange={setPid}
          />
        )}
      </div>

      {activePanel === 'terminal' && (
        <div className="px-3 py-[7px] border-t border-op-border-soft flex items-center justify-between font-mono text-[10.5px] text-op-zinc-500 shrink-0">
          <span>
            {shellName(window.deck.env.shell)}
            {pid !== null ? ` · pid ${pid}` : ''}
          </span>
          <span>global · stays alive until ⌘Q</span>
        </div>
      )}
    </div>
  )
}
