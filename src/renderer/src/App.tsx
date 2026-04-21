import { Terminal } from './components/Terminal'
import { useDeckBootstrap } from './hooks/useDeckBootstrap'

export function App(): React.JSX.Element {
  useDeckBootstrap()
  const cwd = window.deck.env.home
  const command = `cd ${JSON.stringify(cwd)} && claude`
  return (
    <div className="bg-op-base h-full w-full p-2">
      <Terminal cwd={cwd} command={command} />
    </div>
  )
}
