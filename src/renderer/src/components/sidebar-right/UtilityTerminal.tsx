import '@xterm/xterm/css/xterm.css'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { PtyId } from '../../../../shared/ipc'
import { useDeckStore } from '@/stores/deck'

interface UtilityTerminalProps {
  cwd: string
  visible: boolean
  onPidChange?: (pid: number | null) => void
}

export function UtilityTerminal({
  cwd,
  visible,
  onPidChange
}: UtilityTerminalProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<PtyId | null>(null)
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
      if (
        e.type === 'keydown' &&
        e.key === 'Enter' &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        const ptyId = ptyIdRef.current
        if (ptyId) window.deck.pty.write(ptyId, '\x1b[13;2u')
        return false
      }
      return true
    })

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
        cwd,
        shell: window.deck.env.shell,
        cols: term.cols,
        rows: term.rows
      })
      .then(({ ptyId, pid }) => {
        if (cleanedUp) {
          window.deck.pty.kill(ptyId)
          return
        }

        ptyIdRef.current = ptyId
        onPidChange?.(pid ?? null)

        term.onData((data) => window.deck.pty.write(ptyId, data))

        unsubData = window.deck.pty.onData(ptyId, (chunk) => {
          term.write(chunk)
        })

        unsubExit = window.deck.pty.onExit(ptyId, (info) => {
          term.write(`\r\n\x1b[90m[pty exited: code=${info.exitCode}]\x1b[0m\r\n`)
          onPidChange?.(null)
        })
      })
      .catch((err) => {
        console.error('[UtilityTerminal] spawn failed:', err)
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
      term.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [visible])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '20px',
        right: '22px',
        bottom: '20px',
        left: '22px',
        display: visible ? 'block' : 'none'
      }}
    />
  )
}

export function useUtilityCwd(): string {
  return useDeckStore((s) => {
    const activeSession = s.activeSessionId
      ? s.sessions.find((x) => x.id === s.activeSessionId)
      : null
    const workspace = activeSession
      ? s.workspaces.find((w) => w.id === activeSession.workspaceId)
      : null
    return workspace?.path ?? ''
  })
}
