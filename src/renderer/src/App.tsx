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
        <div className="flex-1 min-h-0 overflow-hidden">
          <Terminal cwd={cwd} command={command} />
        </div>
        <StatusBar />
      </AppBody>
    </AppShell>
  )
}
