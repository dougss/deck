import { useEffect, useRef, useState } from 'react'
import { useDeckStore, useActivePlannerSession } from '@/stores/deck'
import { DiffPanel } from './DiffPanel'
import { PanelHeader } from './PanelHeader'
import { PlannerEmptyState } from './PlannerEmptyState'
import { PlannerHeader } from './PlannerHeader'
import { PlannerSettingsDialog } from './PlannerSettingsDialog'
import { PlannerTerminalHost, PlannerIdleOverlay } from './PlannerTerminalHost'
import { UtilityTerminal } from './UtilityTerminal'
import type { Session } from '../../../../shared/ipc'

function basename(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? filePath
}

function shellName(shellPath: string): string {
  return basename(shellPath)
}

export function RightPanel(): React.JSX.Element {
  const activePanel = useDeckStore((s) => s.activeRightPanel)
  const pinned = useDeckStore((s) => s.rightPanelPinned)
  const plannerSession = useActivePlannerSession()

  const [spawnedCwd, setSpawnedCwd] = useState('')
  const [pid, setPid] = useState<number | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [plannerSettingsOpen, setPlannerSettingsOpen] = useState(false)
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

  const isOverlay = !pinned
  const terminalContext = spawnedCwd ? basename(spawnedCwd) : ''
  const attachedPlanner =
    plannerSession?.ptyId != null ? (plannerSession as Session & { ptyId: string }) : null

  const handleStopPlanner = (): void => {
    if (!plannerSession) return
    window.deck.session.detach({ id: plannerSession.id }).catch((err) => {
      console.error('[RightPanel] planner stop failed:', err)
    })
  }

  return (
    <div
      className="w-full h-full bg-op-surface border-l border-op-border flex flex-col overflow-hidden"
      style={{
        boxShadow: isOverlay
          ? '-14px 0 36px -8px rgba(0,0,0,0.5), -2px 0 0 0 var(--op-border)'
          : 'none'
      }}
    >
      {activePanel === 'planner' && (
        <PlannerHeader
          planner={plannerSession ?? null}
          onStop={handleStopPlanner}
          onOpenSettings={() => setPlannerSettingsOpen(true)}
        />
      )}
      {activePanel === 'terminal' && (
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
          <PlannerTerminalHost activePlannerId={attachedPlanner?.id ?? null} />
          {!attachedPlanner && (
            <div className="absolute inset-0">
              {plannerSession ? (
                <PlannerIdleOverlay planner={plannerSession} />
              ) : (
                <PlannerEmptyState />
              )}
            </div>
          )}
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

        {/* Diff panel */}
        <div
          className="absolute inset-0 flex flex-col min-w-0"
          style={{ display: activePanel === 'diff' ? 'flex' : 'none' }}
        >
          {activePanel === 'diff' && <DiffPanel />}
        </div>
      </div>

      {activePanel === 'terminal' && (
        <div className="px-3 py-[7px] border-t border-op-border-dim flex items-center justify-between font-mono text-[10.5px] text-op-zinc-500 shrink-0">
          <span>
            {shellName(window.deck.env.shell)}
            {pid !== null ? ` · pid ${pid}` : ''}
          </span>
          <span>global · stays alive until ⌘Q</span>
        </div>
      )}

      {plannerSettingsOpen && (
        <PlannerSettingsDialog onClose={() => setPlannerSettingsOpen(false)} />
      )}
    </div>
  )
}
