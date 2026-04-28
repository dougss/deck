import { Settings, HelpCircle } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { SettingsDialog } from '../settings/SettingsDialog'
import { useDeckStore } from '@/stores/deck'

interface SidebarFooterProps {
  onSettingsSaved: () => Promise<void>
}

export function SidebarFooter({ onSettingsSaved }: SidebarFooterProps): React.JSX.Element {
  const isSettingsOpen = useDeckStore((s) => s.isSettingsOpen)
  const openSettingsDialog = useDeckStore((s) => s.openSettingsDialog)
  const closeSettingsDialog = useDeckStore((s) => s.closeSettingsDialog)

  return (
    <div className="h-10 flex-shrink-0 border-t border-op-border flex items-center justify-between px-3">
      <div className="flex gap-0.5">
        <IconButton label="Settings" title="Settings" onClick={openSettingsDialog}>
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Help" title="Help">
          <HelpCircle size={16} strokeWidth={1.75} />
        </IconButton>
      </div>
      <span className="font-mono text-[10px] text-op-zinc-600">v0.3.0-beta.8</span>

      {isSettingsOpen && <SettingsDialog onSaved={onSettingsSaved} onClose={closeSettingsDialog} />}
    </div>
  )
}
