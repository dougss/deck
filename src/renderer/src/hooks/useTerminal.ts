import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export interface UseTerminalOptions {
  cwd: string
  shell?: string
  command?: string
}

export function useTerminal(options: UseTerminalOptions): {
  containerRef: React.RefObject<HTMLDivElement | null>
} {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let ptyId: string | null = null
    let unsubData: (() => void) | null = null
    let unsubExit: (() => void) | null = null
    let resizeObserver: ResizeObserver | null = null
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const term = new XTerm({
      fontFamily: 'SF Mono, Menlo, monospace',
      fontSize: 13,
      theme: {
        background: '#0d0e12',
        foreground: '#e5e5e5',
        cursor: '#4a9eed',
        selectionBackground: 'rgba(74, 158, 237, 0.3)'
      },
      cursorBlink: true,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    term.open(container)
    fitAddon.fit()

    const dataDisposable = term.onData((data) => {
      if (ptyId) window.deck.pty.write(ptyId, data)
    })

    const boot = async (): Promise<void> => {
      const res = await window.deck.pty.spawn({
        cwd: options.cwd,
        cols: term.cols,
        rows: term.rows,
        shell: options.shell,
        command: options.command
      })

      if (cancelled) {
        window.deck.pty.kill(res.ptyId)
        return
      }

      ptyId = res.ptyId
      unsubData = window.deck.pty.onData(ptyId, (chunk) => term.write(chunk))
      unsubExit = window.deck.pty.onExit(ptyId, (info) => {
        term.write(`\r\n\x1b[90m[pty exited: code=${info.exitCode}]\x1b[0m\r\n`)
      })
    }

    void boot()

    resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        fitAddon.fit()
        if (ptyId) window.deck.pty.resize(ptyId, term.cols, term.rows)
      }, 100)
    })
    resizeObserver.observe(container)

    return () => {
      cancelled = true
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeObserver?.disconnect()
      dataDisposable.dispose()
      unsubData?.()
      unsubExit?.()
      if (ptyId) window.deck.pty.kill(ptyId)
      term.dispose()
    }
  }, [options.cwd, options.shell, options.command])

  return { containerRef }
}
