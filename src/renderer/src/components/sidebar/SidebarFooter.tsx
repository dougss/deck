import { useState } from 'react'
import { Settings, HelpCircle } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { SettingsDialog } from '../settings/SettingsDialog'

interface SidebarFooterProps {
  onSettingsSaved: () => Promise<void>
}

export function SidebarFooter({ onSettingsSaved }: SidebarFooterProps): React.JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="h-10 flex-shrink-0 border-t border-op-border flex items-center justify-between px-3">
      <div className="flex gap-0.5">
        <IconButton label="Settings" title="Settings" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Help" title="Help">
          <HelpCircle size={16} strokeWidth={1.75} />
        </IconButton>
      </div>
      <span className="font-mono text-[10px] text-op-zinc-600">v0.3.0-beta.4</span>

      {isSettingsOpen && (
        <SettingsDialog onSaved={onSettingsSaved} onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  )
}
