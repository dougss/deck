import { Terminal } from './components/Terminal'

export function App(): React.JSX.Element {
  const cwd = window.deck.env.home
  const command = `cd ${JSON.stringify(cwd)} && claude`
  return (
    <div className="h-full w-full bg-[#0d0e12] p-2">
      <Terminal cwd={cwd} command={command} />
    </div>
  )
}
