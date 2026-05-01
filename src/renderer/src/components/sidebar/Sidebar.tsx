import { useState, useEffect, useCallback } from 'react'
import type { DeckSettings } from '../../../../shared/ipc'
import { SidebarHeader } from './SidebarHeader'
import { SidebarSearch } from './SidebarSearch'
import { WorkspaceList } from './WorkspaceList'
import { SidebarFooter } from './SidebarFooter'

export function Sidebar(): React.JSX.Element {
  const [settings, setSettings] = useState<DeckSettings | null>(null)

  const refreshSettings = useCallback(async () => {
    const s = await window.deck.settings.get()
    setSettings(s)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSettings()
  }, [refreshSettings])

  return (
    <aside className="w-full h-full bg-op-surface border-r border-op-border flex flex-col">
      <SidebarHeader />
      <SidebarSearch />
      <WorkspaceList settings={settings} />
      <SidebarFooter onSettingsSaved={refreshSettings} />
    </aside>
  )
}
