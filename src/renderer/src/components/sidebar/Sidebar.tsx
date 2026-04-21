import { SidebarHeader } from './SidebarHeader'
import { SidebarSearch } from './SidebarSearch'
import { WorkspaceList } from './WorkspaceList'
import { SidebarFooter } from './SidebarFooter'

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="w-[280px] flex-shrink-0 bg-op-surface border-r border-op-border flex flex-col">
      <SidebarHeader />
      <SidebarSearch />
      <WorkspaceList />
      <SidebarFooter />
    </aside>
  )
}
