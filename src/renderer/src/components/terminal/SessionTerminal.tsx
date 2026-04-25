import '@xterm/xterm/css/xterm.css'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { PtyId, SessionId } from '../../../../shared/ipc'

// NOTE: Task 10 migration from Phase 1 Terminal.tsx.
// Phase 1 model: xterm spawns its own PTY via pty.spawn, owns kill on unmount.
// Phase 2 model: xterm attaches to an externally-managed ptyId; lifecycle
// (spawn/kill) belongs to SessionManager via session.attach/detach.
// Preserved from Phase 1: xterm theme, font stack, FitAddon + WebLinks addons,
// ResizeObserver debounce (100ms), cursorBlink, allowProposedApi.
// Intentionally removed: internal pty.spawn, pty.kill on unmount.

interface SessionTerminalProps {
  sessionId: SessionId
  ptyId: PtyId
  visible: boolean
}

export function SessionTerminal({
  sessionId,
  ptyId,
  visible
}: SessionTerminalProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const visibleRef = useRef(visible)
  visibleRef.current = visible

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

    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type !== 'keydown') return true
      // Shift+Enter: insert newline without submitting (Meta+Enter / ESC+CR)
      if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        window.deck.pty.write(ptyId, '\x1b\r')
        return false
      }
      // Cmd+Left/Right: beginning/end of line (Ctrl+A / Ctrl+E)
      if (e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'ArrowLeft') {
          window.deck.pty.write(ptyId, '\x01')
          return false
        }
        if (e.key === 'ArrowRight') {
          window.deck.pty.write(ptyId, '\x05')
          return false
        }
      }
      return true
    })

    if (visibleRef.current) {
      fit.fit()
      window.deck.pty.resize(ptyId, term.cols, term.rows)
    }

    const inputDisposable = term.onData((data) => {
      window.deck.pty.write(ptyId, data)
    })

    const unsubData = window.deck.pty.onData(ptyId, (chunk) => {
      term.write(chunk)
    })

    const unsubExit = window.deck.pty.onExit(ptyId, (info) => {
      term.write(`\r\n\x1b[90m[pty exited: code=${info.exitCode}]\x1b[0m\r\n`)
    })

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver(() => {
      if (!visibleRef.current) return
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const t = termRef.current
        const f = fitRef.current
        if (!t || !f) return
        f.fit()
        window.deck.pty.resize(ptyId, t.cols, t.rows)
      }, 100)
    })
    observer.observe(container)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      observer.disconnect()
      inputDisposable.dispose()
      unsubData()
      unsubExit()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [ptyId])

  useLayoutEffect(() => {
    if (!visible) return
    const raf = requestAnimationFrame(() => {
      const term = termRef.current
      const fit = fitRef.current
      if (!term || !fit) return
      fit.fit()
      window.deck.pty.resize(ptyId, term.cols, term.rows)
      term.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [visible, ptyId])

  return (
    <div
      ref={containerRef}
      data-session-id={sessionId}
      style={{
        position: 'absolute',
        top: '20px',
        right: '0',
        bottom: '20px',
        left: '22px',
        display: visible ? 'block' : 'none'
      }}
    />
  )
}
