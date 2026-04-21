interface KbdProps {
  children: React.ReactNode
}

export function Kbd({ children }: KbdProps): React.JSX.Element {
  return (
    <kbd className="font-mono text-[10px] leading-none text-op-zinc-400 bg-op-zinc-800 border border-op-zinc-700 rounded px-[5px] py-[2px]">
      {children}
    </kbd>
  )
}
