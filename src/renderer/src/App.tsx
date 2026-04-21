import { Terminal } from './components/Terminal'

export function App(): React.JSX.Element {
  const cwd = window.deck.env.home
  const command = `cd ${JSON.stringify(cwd)} && claude`
  return (
    <div className="bg-op-base h-full w-full p-2">
      <Terminal cwd={cwd} command={command} />
    </div>
  )
}
