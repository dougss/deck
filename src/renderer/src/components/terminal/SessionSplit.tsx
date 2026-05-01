import { useCallback, useEffect, useRef, useState } from 'react'
import type { PtyId, SessionId } from '../../../../shared/ipc'
import { useDeckStore, useEmbeddedFocus, useEmbeddedToggle } from '@/stores/deck'
import {
  EMBEDDED_RATIO_MAX,
  EMBEDDED_RATIO_MIN,
  getEmbeddedRatio,
  setEmbeddedRatio
} from '@/lib/embedded-terminal-storage'
import { SessionTerminal } from './SessionTerminal'
import { EmbeddedTerminal } from './EmbeddedTerminal'
import { ResizableSplitHandle } from './ResizableSplitHandle'

interface SessionSplitProps {
  sessionId: SessionId
  ptyId: PtyId
  cwd: string
  visible: boolean
}

export function SessionSplit({
  sessionId,
  ptyId,
  cwd,
  visible
}: SessionSplitProps): React.JSX.Element {
  const embeddedOn = useEmbeddedToggle(sessionId)
  const focus = useEmbeddedFocus(sessionId)
  const setEmbeddedFocus = useDeckStore((s) => s.setEmbeddedFocus)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ratio, setRatio] = useState<number>(() => getEmbeddedRatio())
  const ratioRef = useRef(ratio)

  useEffect(() => {
    ratioRef.current = ratio
  })

  // Re-read global ratio whenever this session becomes visible (another session may have updated it).
  useEffect(() => {
    if (!visible) return
    const fresh = getEmbeddedRatio()
    if (fresh !== ratioRef.current) setRatio(fresh)
  }, [visible])

  const handleDrag = useCallback((clientY: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.height <= 0) return
    const fromBottom = rect.bottom - clientY
    let next = fromBottom / rect.height
    if (next < EMBEDDED_RATIO_MIN) next = EMBEDDED_RATIO_MIN
    if (next > EMBEDDED_RATIO_MAX) next = EMBEDDED_RATIO_MAX
    setRatio(next)
  }, [])

  const handleCommit = useCallback(() => {
    const committed = setEmbeddedRatio(ratioRef.current)
    setRatio(committed)
  }, [])

  const requestMainFocus = useCallback(() => {
    setEmbeddedFocus(sessionId, 'main')
  }, [sessionId, setEmbeddedFocus])

  const requestEmbeddedFocus = useCallback(() => {
    setEmbeddedFocus(sessionId, 'embedded')
  }, [sessionId, setEmbeddedFocus])

  const bottomPct = embeddedOn ? ratio * 100 : 0
  const topPct = 100 - bottomPct

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: visible ? 'block' : 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${topPct}%`
        }}
      >
        <SessionTerminal
          sessionId={sessionId}
          ptyId={ptyId}
          visible={visible}
          focused={!embeddedOn || focus === 'main'}
          onFocusRequest={requestMainFocus}
        />
      </div>
      {embeddedOn && (
        <div
          style={{
            position: 'absolute',
            top: `${topPct}%`,
            left: 0,
            right: 0,
            transform: 'translateY(-50%)'
          }}
        >
          <ResizableSplitHandle onDrag={handleDrag} onCommit={handleCommit} />
        </div>
      )}
      {/* EmbeddedTerminal stays mounted while the session is attached so the
          PTY survives toggle off/on. Visibility is controlled via CSS. */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${bottomPct}%`,
          display: embeddedOn ? 'block' : 'none'
        }}
      >
        <EmbeddedTerminal
          sessionId={sessionId}
          cwd={cwd}
          visible={visible && embeddedOn}
          focused={focus === 'embedded'}
          onFocusRequest={requestEmbeddedFocus}
        />
      </div>
    </div>
  )
}
