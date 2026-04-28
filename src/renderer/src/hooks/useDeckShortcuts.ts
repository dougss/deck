import { useEffect } from 'react'
import { useDeckStore } from '@/stores/deck'

export function useDeckShortcuts(): void {
  useEffect(() => {
    const unsubNew = window.deck.shortcuts.onNewSession(() => {
      const state = useDeckStore.getState()
      const { workspaces, sessions, activeSessionId } = state

      let targetWorkspaceId: string | null = null
      if (activeSessionId) {
        const active = sessions.find((s) => s.id === activeSessionId)
        if (active) targetWorkspaceId = active.workspaceId
      }
      if (!targetWorkspaceId) {
        // workspaces are already sorted by ordinal in the store
        const first = workspaces[0]
        if (!first) return
        targetWorkspaceId = first.id
      }

      state.openNewSessionDialog(targetWorkspaceId)
    })

    const unsubStop = window.deck.shortcuts.onStopSession(() => {
      const { sessions, activeSessionId } = useDeckStore.getState()
      if (!activeSessionId) return
      const active = sessions.find((s) => s.id === activeSessionId)
      if (!active?.ptyId) return
      window.deck.session.detach({ id: active.id }).catch((err) => {
        console.error('[shortcuts] ⌘W detach failed:', err)
      })
    })

    const unsubSwitch = window.deck.shortcuts.onSwitchSession((n: number) => {
      const { workspaces, sessions, setActive } = useDeckStore.getState()
      // Sidebar order: workspaces by ordinal (already sorted), sessions by createdAt within workspace
      const ordered = workspaces.flatMap((ws) =>
        sessions.filter((s) => s.workspaceId === ws.id).sort((a, b) => a.createdAt - b.createdAt)
      )
      const target = ordered[n - 1]
      if (target) setActive(target.id)
    })

    const unsubFocus = window.deck.shortcuts.onFocusSearch(() => {
      useDeckStore.getState().triggerFocusSearch()
    })

    const unsubTogglePanel = window.deck.shortcuts.onTogglePanel(() => {
      const state = useDeckStore.getState()
      if (state.activeRightPanel !== null) {
        state.toggleRightPanel(state.activeRightPanel)
      } else {
        state.toggleRightPanel(state.lastActiveRightPanel)
      }
    })

    const unsubBranch = window.deck.shortcuts.onBranchSwitcher(() => {
      const { activeSessionId, sessions, gitInfoMap, triggerOpenBranchSwitcher } =
        useDeckStore.getState()
      if (!activeSessionId) return
      const active = sessions.find((s) => s.id === activeSessionId)
      if (!active || active.status !== 'working') return
      if (!gitInfoMap[activeSessionId]?.isRepo) return
      triggerOpenBranchSwitcher()
    })

    const unsubPalette = window.deck.shortcuts.onCommandPalette(() => {
      useDeckStore.getState().openPalette()
    })

    return () => {
      unsubNew()
      unsubStop()
      unsubSwitch()
      unsubFocus()
      unsubTogglePanel()
      unsubBranch()
      unsubPalette()
    }
  }, [])
}
