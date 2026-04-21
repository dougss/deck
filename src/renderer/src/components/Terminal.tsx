import '@xterm/xterm/css/xterm.css'
import { useTerminal } from '../hooks/useTerminal'

export interface TerminalProps {
  cwd: string
  shell?: string
  command?: string
}

export function Terminal(props: TerminalProps): React.JSX.Element {
  const { containerRef } = useTerminal(props)
  return <div ref={containerRef} className="h-full w-full" />
}
