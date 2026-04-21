import { AppBody } from './components/shell/AppBody'
import { AppShell } from './components/shell/AppShell'
import { StatusBar } from './components/session/StatusBar'
import { Terminal } from './components/Terminal'
import { useDeckBootstrap } from './hooks/useDeckBootstrap'

export function App(): React.JSX.Element {
  useDeckBootstrap()
  const cwd = window.deck.env.home
  const command = `cd ${JSON.stringify(cwd)} && claude`
  return (
    <AppShell>
      <AppBody>
        {/* border-t + border-l: double-border pattern matching mockup (.terminal css).
            border-l because sidebar is on the left; invert if sidebar moves right. */}
        <div className="flex-1 min-h-0 overflow-hidden border-t border-l border-tv-border">
          <Terminal cwd={cwd} command={command} />
        </div>
        <StatusBar />
      </AppBody>
    </AppShell>
  )
}
