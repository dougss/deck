import { useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { useDeckStore } from '@/stores/deck'
import type { Session } from '../../../../shared/ipc'
import { SessionTerminal } from '../terminal/SessionTerminal'

interface PlannerTerminalHostProps {
  activePlannerId: string | null
}

interface PlannerIdleOverlayProps {
  planner: Session
}

export function PlannerTerminalHost({
  activePlannerId
}: PlannerTerminalHostProps): React.JSX.Element {
  const planners = useDeckStore(
    useShallow((s) =>
      s.sessions.filter(
        (x): x is Session & { ptyId: string } => x.ptyId !== null && x.kind === 'planner'
      )
    )
  )

  return (
    <div className="relative flex-1 min-h-0">
      {planners.map((p) => (
        <SessionTerminal
          key={p.id}
          sessionId={p.id}
          ptyId={p.ptyId}
          visible={p.id === activePlannerId}
        />
      ))}
    </div>
  )
}

export function PlannerIdleOverlay({ planner }: PlannerIdleOverlayProps): React.JSX.Element {
  const [attaching, setAttaching] = useState(false)

  const handleReattach = async (): Promise<void> => {
    if (attaching) return
    setAttaching(true)
    try {
      await window.deck.session.attach({ id: planner.id })
    } catch (err) {
      console.error('[PlannerIdleOverlay] re-attach failed:', err)
      setAttaching(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <p className="text-op-zinc-400 text-xs">Planner is idle</p>
      <button
        disabled={attaching}
        onClick={() => void handleReattach()}
        className="px-3.5 py-1.5 bg-op-accent text-white border-none rounded-md text-xs font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
      >
        {attaching ? 'Connecting…' : 'Re-attach'}
      </button>
    </div>
  )
}
