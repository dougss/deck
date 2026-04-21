import { useShallow } from 'zustand/shallow'
import { useDeckStore, useActiveSessionId } from '../../stores/deck'
import type { Session } from '../../../../shared/ipc'
import { SessionTerminal } from './SessionTerminal'

export function TerminalHost(): React.JSX.Element {
  const attached = useDeckStore(
    useShallow((s) => s.sessions.filter((x): x is Session & { ptyId: string } => x.ptyId !== null))
  )
  const activeId = useActiveSessionId()

  if (attached.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#080808]">
        <div className="text-center">
          <div className="text-tv-default text-sm font-medium">No active session</div>
          <div className="text-tv-muted mt-2 text-xs">
            Create or select a session from the sidebar to start
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-[#080808]">
      {attached.map((s) => (
        <SessionTerminal key={s.id} sessionId={s.id} ptyId={s.ptyId} visible={s.id === activeId} />
      ))}
    </div>
  )
}
