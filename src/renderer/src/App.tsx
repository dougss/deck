import { AppBody } from './components/shell/AppBody'
import { AppShell } from './components/shell/AppShell'
import { StatusBar } from './components/session/StatusBar'
import { TerminalHost } from './components/terminal/TerminalHost'
import { useDeckBootstrap } from './hooks/useDeckBootstrap'

export function App(): React.JSX.Element {
  useDeckBootstrap()
  return (
    <AppShell>
      <AppBody>
        {/* border-t + border-l: double-border pattern matching mockup (.terminal css).
            border-l because sidebar is on the left; invert if sidebar moves right. */}
        <div className="flex-1 min-h-0 overflow-hidden border-t border-l border-tv-border">
          <TerminalHost />
        </div>
        <StatusBar />
      </AppBody>
    </AppShell>
  )
}
