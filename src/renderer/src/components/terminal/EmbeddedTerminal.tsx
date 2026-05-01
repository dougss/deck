import '@xterm/xterm/css/xterm.css'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { PtyId, SessionId } from '../../../../shared/ipc'
import { handleMacOSKey } from '@/lib/macos-terminal-keys'

interface EmbeddedTerminalProps {
  sessionId: SessionId
  cwd: string
  visible: boolean
  focused: boolean
  onFocusRequest?: () => void
}

export function EmbeddedTerminal({
  sessionId,
  cwd,
  visible,
  focused,
  onFocusRequest
}: EmbeddedTerminalProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<PtyId | null>(null)
  const visibleRef = useRef(visible)

  useEffect(() => {
    visibleRef.current = visible
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new XTerm({
      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: '#080808',
        foreground: '#e8e8e8',
        cursor: '#7c3aed',
        cursorAccent: '#080808',
        selectionBackground: 'rgba(139, 92, 246, 0.25)'
      },
      cursorBlink: true,
      allowProposedApi: true
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon((_, url) => window.deck.system.openExternal(url)))
    term.open(container)
    termRef.current = term
    fitRef.current = fit

    term.attachCustomKeyEventHandler((e: KeyboardEvent) =>
      handleMacOSKey(e, (data) => {
        const ptyId = ptyIdRef.current
        if (ptyId) window.deck.pty.write(ptyId, data)
      })
    )

    if (visibleRef.current) {
      fit.fit()
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver(() => {
      if (!visibleRef.current) return
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const t = termRef.current
        const f = fitRef.current
        const ptyId = ptyIdRef.current
        if (!t || !f || !ptyId) return
        f.fit()
        window.deck.pty.resize(ptyId, t.cols, t.rows)
      }, 100)
    })
    observer.observe(container)

    let cleanedUp = false
    let unsubData: (() => void) | null = null
    let unsubExit: (() => void) | null = null

    window.deck.pty
      .spawn({
        sessionId,
        cwd,
        shell: '/bin/zsh',
        args: ['-il'],
        cols: term.cols,
        rows: term.rows
      })
      .then(({ ptyId }) => {
        if (cleanedUp) {
          window.deck.pty.kill(ptyId)
          return
        }

        ptyIdRef.current = ptyId

        term.onData((data) => window.deck.pty.write(ptyId, data))

        unsubData = window.deck.pty.onData(ptyId, (chunk) => {
          term.write(chunk)
        })

        unsubExit = window.deck.pty.onExit(ptyId, (info) => {
          term.write(`\r\n\x1b[90m[pty exited: code=${info.exitCode}]\x1b[0m\r\n`)
        })
      })
      .catch((err) => {
        console.error('[EmbeddedTerminal] spawn failed:', err)
      })

    return () => {
      cleanedUp = true
      if (resizeTimer) clearTimeout(resizeTimer)
      observer.disconnect()
      unsubData?.()
      unsubExit?.()
      if (ptyIdRef.current) {
        window.deck.pty.kill(ptyIdRef.current)
        ptyIdRef.current = null
      }
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
    // sessionId + cwd are stable per mount (component is keyed by sessionId in parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    if (!visible) return
    const raf = requestAnimationFrame(() => {
      const term = termRef.current
      const fit = fitRef.current
      const ptyId = ptyIdRef.current
      if (!term || !fit) return
      fit.fit()
      if (ptyId) window.deck.pty.resize(ptyId, term.cols, term.rows)
      if (focused) term.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [visible, focused])

  return (
    <div
      onMouseDown={onFocusRequest}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <div
        ref={containerRef}
        data-embedded-session-id={sessionId}
        style={{
          position: 'absolute',
          inset: 0,
          display: visible ? 'block' : 'none'
        }}
      />
    </div>
  )
}
