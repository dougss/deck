import { Settings, HelpCircle } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

export function SidebarFooter(): React.JSX.Element {
  return (
    <div className="h-10 flex-shrink-0 border-t border-op-border flex items-center justify-between px-3">
      <div className="flex gap-0.5">
        <IconButton label="Settings" title="Settings">
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Help" title="Help">
          <HelpCircle size={16} strokeWidth={1.75} />
        </IconButton>
      </div>
      <span className="font-mono text-[10px] text-op-zinc-600">v0.2.0-alpha.1</span>
    </div>
  )
}
