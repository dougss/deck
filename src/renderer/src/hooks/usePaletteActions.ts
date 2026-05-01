import { useMemo } from 'react'
import { useDeckStore } from '@/stores/deck'
import { useShallow } from 'zustand/shallow'
import type { WorkspaceId } from '../../../shared/ipc'

export type PaletteCategory = 'sessions' | 'workspaces' | 'git' | 'settings'

export interface PaletteAction {
  id: string
  label: string
  category: PaletteCategory
  keyboardHint?: string
  handler: () => void
}

export function usePaletteActions(): PaletteAction[] {
  const {
    sessions,
    workspaces,
    activeSessionId,
    gitInfoMap,
    openNewSessionDialog,
    setActive,
    triggerOpenBranchSwitcher,
    openSettingsDialog,
    closePalette,
    expandedWorkspaceIds
  } = useDeckStore(
    useShallow((s) => ({
      sessions: s.sessions,
      workspaces: s.workspaces,
      activeSessionId: s.activeSessionId,
      gitInfoMap: s.gitInfoMap,
      openNewSessionDialog: s.openNewSessionDialog,
      setActive: s.setActive,
      triggerOpenBranchSwitcher: s.triggerOpenBranchSwitcher,
      openSettingsDialog: s.openSettingsDialog,
      closePalette: s.closePalette,
      expandedWorkspaceIds: s.expandedWorkspaceIds
    }))
  )

  return useMemo(() => {
    const targetWorkspaceId = (): WorkspaceId => {
      if (activeSessionId) {
        const active = sessions.find((s) => s.id === activeSessionId)
        if (active) return active.workspaceId
      }
      return workspaces[0]?.id ?? ''
    }

    const sessionActions: PaletteAction[] = [
      {
        id: 'new-claude-code-session',
        label: 'New Claude Code session',
        category: 'sessions',
        keyboardHint: '⌘N',
        handler: () => {
          const wsId = targetWorkspaceId()
          if (!wsId) return
          closePalette()
          openNewSessionDialog(wsId, 'claude-code')
        }
      },
      {
        id: 'new-shell-session',
        label: 'New Shell session',
        category: 'sessions',
        handler: () => {
          const wsId = targetWorkspaceId()
          if (!wsId) return
          closePalette()
          openNewSessionDialog(wsId, 'shell')
        }
      },
      {
        id: 'new-gemini-session',
        label: 'New Gemini session',
        category: 'sessions',
        handler: () => {
          const wsId = targetWorkspaceId()
          if (!wsId) return
          closePalette()
          openNewSessionDialog(wsId, 'gemini')
        }
      },
      ...sessions.map((s) => ({
        id: `switch-session-${s.id}`,
        label: `Switch to ${s.name}`,
        category: 'sessions' as PaletteCategory,
        handler: () => {
          closePalette()
          setActive(s.id)
        }
      }))
    ]

    const workspaceActions: PaletteAction[] = workspaces.map((ws) => ({
      id: `switch-workspace-${ws.id}`,
      label: `Switch to ${ws.name}`,
      category: 'workspaces',
      handler: () => {
        closePalette()
        // Scroll workspace into view in the sidebar
        requestAnimationFrame(() => {
          document
            .getElementById(`workspace-${ws.id}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          // Expand if collapsed (expandedWorkspaceIds drives sidebar collapse)
          if (!expandedWorkspaceIds[ws.id]) {
            useDeckStore.getState().toggleWorkspace(ws.id)
          }
        })
      }
    }))

    const activeGitInfo = activeSessionId ? gitInfoMap[activeSessionId] : null
    const gitActions: PaletteAction[] = activeGitInfo?.isRepo
      ? [
          {
            id: 'switch-branch',
            label: 'Switch branch',
            category: 'git',
            keyboardHint: '⌘⇧B',
            handler: () => {
              closePalette()
              triggerOpenBranchSwitcher()
            }
          }
        ]
      : []

    const settingsActions: PaletteAction[] = [
      {
        id: 'open-settings',
        label: 'Open settings',
        category: 'settings',
        handler: () => {
          closePalette()
          openSettingsDialog()
        }
      }
    ]

    return [...sessionActions, ...workspaceActions, ...gitActions, ...settingsActions]
  }, [
    sessions,
    workspaces,
    activeSessionId,
    gitInfoMap,
    openNewSessionDialog,
    setActive,
    triggerOpenBranchSwitcher,
    openSettingsDialog,
    closePalette,
    expandedWorkspaceIds
  ])
}
