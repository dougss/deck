export function Titlebar(): React.JSX.Element {
  return (
    <div
      className="h-10 flex-shrink-0 flex items-center bg-op-titlebar border-b border-op-border-dim relative"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-semibold tracking-[0.01em] text-op-zinc-300 pointer-events-none select-none">
        Deck
      </span>
    </div>
  )
}
