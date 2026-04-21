export function SidebarHeader(): React.JSX.Element {
  return (
    <div className="h-[60px] flex-shrink-0 flex items-center justify-between px-4 border-b border-op-border">
      <div className="flex items-center gap-2">
        {/* BrandMark */}
        <span className="relative w-[18px] h-[18px] flex-shrink-0 rounded-[4px] bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_2px_8px_rgba(124,58,237,0.3)]">
          <span className="absolute inset-[3px] rounded-[2px] bg-gradient-to-br from-white/20 to-transparent" />
        </span>
        <span className="font-display text-[17px] font-semibold text-op-zinc-50 tracking-[-0.01em] leading-none">
          Deck
        </span>
      </div>
      {/* AccountAvatar */}
      <span
        title="Account"
        className="w-[26px] h-[26px] flex-shrink-0 rounded-full bg-gradient-to-br from-[#3f3f46] to-[#18181b] border border-op-border flex items-center justify-center font-mono text-[10px] font-semibold text-op-zinc-300 cursor-pointer select-none"
      >
        D
      </span>
    </div>
  )
}
