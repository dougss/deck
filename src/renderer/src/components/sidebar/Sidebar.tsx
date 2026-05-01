import { useSettings } from '../../hooks/useSettings'
import { SidebarHeader } from './SidebarHeader'
import { SidebarSearch } from './SidebarSearch'
import { WorkspaceList } from './WorkspaceList'
import { SidebarFooter } from './SidebarFooter'

export function Sidebar(): React.JSX.Element {
  const [settings, refreshSettings] = useSettings()

  return (
    <aside className="w-full h-full bg-op-surface border-r border-op-border flex flex-col">
      <SidebarHeader />
      <SidebarSearch />
      <WorkspaceList settings={settings} />
      <SidebarFooter onSettingsSaved={refreshSettings} />
    </aside>
  )
}
