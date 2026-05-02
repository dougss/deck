import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { devtools } from 'zustand/middleware'
import type {
  GitInfo,
  GitInfoUpdatedEvent,
  Session,
  SessionId,
  SessionType,
  SessionUpdateEvent,
  Workspace,
  WorkspaceId,
  WorkspaceUpdateEvent,
  NotificationState
} from '../../../shared/ipc'
import {
  clearEmbeddedToggle,
  getEmbeddedToggle,
  setEmbeddedToggle
} from '@/lib/embedded-terminal-storage'

type ExpandedMap = Record<WorkspaceId, true | undefined>
type NotificationMap = Record<SessionId, NotificationState>
type GitInfoMap = Record<SessionId, GitInfo>
type EmbeddedToggleMap = Record<SessionId, boolean>
type EmbeddedFocusSide = 'main' | 'embedded'
type EmbeddedFocusMap = Record<SessionId, EmbeddedFocusSide>

type RightPanelMode = 'planner' | 'terminal' | 'diff'

interface DeckState {
  workspaces: Workspace[]
  sessions: Session[]

  activeSessionId: SessionId | null
  searchQuery: string
  expandedWorkspaceIds: ExpandedMap

  hydrated: boolean
  hydrationError: string | null

  newSessionDialogWorkspaceId: WorkspaceId | null
  newSessionDialogInitialType: SessionType | null
  isPaletteOpen: boolean
  isSettingsOpen: boolean
  focusSearchTick: number

  activeRightPanel: RightPanelMode | null
  lastActiveRightPanel: RightPanelMode
  rightPanelPinned: boolean

  notificationStates: NotificationMap

  gitInfoMap: GitInfoMap
  openBranchSwitcherTick: number

  embeddedToggleMap: EmbeddedToggleMap
  embeddedFocusMap: EmbeddedFocusMap

  hydrate: () => Promise<void>
  subscribe: () => () => void

  setActive: (id: SessionId | null) => void
  toggleWorkspace: (id: WorkspaceId) => void
  setSearch: (q: string) => void
  openNewSessionDialog: (workspaceId: WorkspaceId, initialType?: SessionType) => void
  closeNewSessionDialog: () => void
  openPalette: () => void
  closePalette: () => void
  openSettingsDialog: () => void
  closeSettingsDialog: () => void
  triggerFocusSearch: () => void
  toggleRightPanel: (mode: RightPanelMode) => void
  setRightPanelPinned: (pinned: boolean) => void
  setNotificationState: (sessionId: SessionId, state: NotificationState) => void
  clearNotificationState: (sessionId: SessionId) => void
  setGitInfo: (sessionId: SessionId, info: GitInfo) => void
  clearGitInfo: (sessionId: SessionId) => void
  triggerOpenBranchSwitcher: () => void
  createPlanner: () => Promise<void>
  toggleEmbeddedTerminal: (sessionId: SessionId) => void
  setEmbeddedFocus: (sessionId: SessionId, side: EmbeddedFocusSide) => void
}

const sortWorkspaces = (ws: Workspace[]): Workspace[] =>
  [...ws].sort((a, b) => a.ordinal - b.ordinal || a.createdAt - b.createdAt)

const sortSessions = (ss: Session[]): Session[] => [...ss].sort((a, b) => a.createdAt - b.createdAt)

const expandAll = (ws: Workspace[]): ExpandedMap => {
  const map: ExpandedMap = {}
  for (const w of ws) map[w.id] = true
  return map
}

let subscribeDispose: (() => void) | null = null

const RIGHT_PANEL_PINNED_KEY = 'deck:rightPanelPinned'

function loadRightPanelPinned(): boolean {
  try {
    return localStorage.getItem(RIGHT_PANEL_PINNED_KEY) === 'true'
  } catch {
    return false
  }
}

export const useDeckStore = create<DeckState>()(
  devtools(
    (set) => ({
      workspaces: [],
      sessions: [],
      activeSessionId: null,
      searchQuery: '',
      expandedWorkspaceIds: {},
      hydrated: false,
      hydrationError: null,
      newSessionDialogWorkspaceId: null,
      newSessionDialogInitialType: null,
      isPaletteOpen: false,
      isSettingsOpen: false,
      focusSearchTick: 0,

      activeRightPanel: null,
      lastActiveRightPanel: 'terminal' as RightPanelMode,
      rightPanelPinned: loadRightPanelPinned(),

      notificationStates: {},

      gitInfoMap: {},
      openBranchSwitcherTick: 0,

      embeddedToggleMap: {},
      embeddedFocusMap: {},

      hydrate: async () => {
        try {
          const [workspaces, sessions] = await Promise.all([
            window.deck.workspace.list(),
            window.deck.session.list()
          ])
          set(
            (state) => ({
              workspaces: sortWorkspaces(workspaces),
              sessions: sortSessions(sessions),
              expandedWorkspaceIds:
                Object.keys(state.expandedWorkspaceIds).length === 0
                  ? expandAll(workspaces)
                  : state.expandedWorkspaceIds,
              hydrated: true,
              hydrationError: null
            }),
            false,
            'deck/hydrate'
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[deck store] hydrate failed:', err)
          set({ hydrationError: message, hydrated: true }, false, 'deck/hydrateError')
        }
      },

      subscribe: () => {
        if (subscribeDispose) return subscribeDispose

        const unsubWs = window.deck.workspace.onUpdated((event: WorkspaceUpdateEvent) => {
          set(
            (state) => {
              if (event.type === 'created') {
                if (state.workspaces.some((w) => w.id === event.workspace.id)) return state
                return {
                  workspaces: sortWorkspaces([...state.workspaces, event.workspace])
                }
              }
              if (event.type === 'updated') {
                return {
                  workspaces: sortWorkspaces(
                    state.workspaces.map((w) => (w.id === event.workspace.id ? event.workspace : w))
                  )
                }
              }
              const restExpanded = { ...state.expandedWorkspaceIds }
              delete restExpanded[event.id]
              return {
                workspaces: state.workspaces.filter((w) => w.id !== event.id),
                expandedWorkspaceIds: restExpanded
              }
            },
            false,
            `workspace/${event.type}`
          )
        })

        const unsubSess = window.deck.session.onUpdated((event: SessionUpdateEvent) => {
          set(
            (state) => {
              if (event.type === 'created') {
                if (state.sessions.some((s) => s.id === event.session.id)) return state
                return {
                  sessions: sortSessions([...state.sessions, event.session])
                }
              }
              if (event.type === 'updated') {
                const prev = state.sessions.find((s) => s.id === event.session.id)
                const nextSessions = sortSessions(
                  state.sessions.map((s) => (s.id === event.session.id ? event.session : s))
                )
                // Hydrate embedded toggle from localStorage when ptyId transitions to non-null
                // (covers initial attach + re-attach after detach).
                const becameAttached =
                  event.session.ptyId !== null && (!prev || prev.ptyId === null)
                if (becameAttached && getEmbeddedToggle(event.session.id)) {
                  return {
                    sessions: nextSessions,
                    embeddedToggleMap: { ...state.embeddedToggleMap, [event.session.id]: true },
                    embeddedFocusMap: {
                      ...state.embeddedFocusMap,
                      [event.session.id]: 'embedded' as EmbeddedFocusSide
                    }
                  }
                }
                // When detached, drop embedded UI state for this session (PTY died).
                const becameDetached = event.session.ptyId === null && prev && prev.ptyId !== null
                if (becameDetached) {
                  const restToggle = { ...state.embeddedToggleMap }
                  delete restToggle[event.session.id]
                  const restFocus = { ...state.embeddedFocusMap }
                  delete restFocus[event.session.id]
                  return {
                    sessions: nextSessions,
                    embeddedToggleMap: restToggle,
                    embeddedFocusMap: restFocus
                  }
                }
                return { sessions: nextSessions }
              }
              const nextGitMap = { ...state.gitInfoMap }
              delete nextGitMap[event.id]
              const restToggle = { ...state.embeddedToggleMap }
              delete restToggle[event.id]
              const restFocus = { ...state.embeddedFocusMap }
              delete restFocus[event.id]
              clearEmbeddedToggle(event.id)
              return {
                sessions: state.sessions.filter((s) => s.id !== event.id),
                activeSessionId: state.activeSessionId === event.id ? null : state.activeSessionId,
                gitInfoMap: nextGitMap,
                embeddedToggleMap: restToggle,
                embeddedFocusMap: restFocus
              }
            },
            false,
            `session/${event.type}`
          )
        })

        const unsubGit = window.deck.git.onInfoUpdated((event: GitInfoUpdatedEvent) => {
          set(
            (state) => ({
              gitInfoMap: { ...state.gitInfoMap, [event.sessionId]: event.gitInfo }
            }),
            false,
            'git/infoUpdated'
          )
        })

        const unsubHooks = window.deck.hooks.onEvent((payload) => {
          set(
            (state) => {
              if (payload.sessionId === state.activeSessionId) return state
              return {
                notificationStates: {
                  ...state.notificationStates,
                  [payload.sessionId]: payload.notificationState
                }
              }
            },
            false,
            'hooks/notification'
          )
        })

        subscribeDispose = () => {
          unsubWs()
          unsubSess()
          unsubGit()
          unsubHooks()
          subscribeDispose = null
        }
        return subscribeDispose
      },

      setActive: (id) =>
        set(
          (state) => ({
            activeSessionId: id,
            notificationStates: id
              ? { ...state.notificationStates, [id]: 'idle' as const }
              : state.notificationStates
          }),
          false,
          'ui/setActive'
        ),

      toggleWorkspace: (id) =>
        set(
          (state) => {
            const next = { ...state.expandedWorkspaceIds }
            if (next[id]) delete next[id]
            else next[id] = true
            return { expandedWorkspaceIds: next }
          },
          false,
          'ui/toggleWorkspace'
        ),

      setSearch: (q) => set({ searchQuery: q }, false, 'ui/setSearch'),

      openNewSessionDialog: (workspaceId, initialType) =>
        set(
          {
            newSessionDialogWorkspaceId: workspaceId,
            newSessionDialogInitialType: initialType ?? null
          },
          false,
          'ui/openNewSessionDialog'
        ),

      closeNewSessionDialog: () =>
        set(
          { newSessionDialogWorkspaceId: null, newSessionDialogInitialType: null },
          false,
          'ui/closeNewSessionDialog'
        ),

      openPalette: () => set({ isPaletteOpen: true }, false, 'ui/openPalette'),
      closePalette: () => set({ isPaletteOpen: false }, false, 'ui/closePalette'),

      openSettingsDialog: () => set({ isSettingsOpen: true }, false, 'ui/openSettingsDialog'),
      closeSettingsDialog: () => set({ isSettingsOpen: false }, false, 'ui/closeSettingsDialog'),

      triggerFocusSearch: () =>
        set(
          (state) => ({ focusSearchTick: state.focusSearchTick + 1 }),
          false,
          'ui/triggerFocusSearch'
        ),

      toggleRightPanel: (mode) =>
        set(
          (state) => {
            if (state.activeRightPanel === mode) {
              return { activeRightPanel: null }
            }
            return { activeRightPanel: mode, lastActiveRightPanel: mode }
          },
          false,
          'ui/toggleRightPanel'
        ),

      setRightPanelPinned: (pinned) => {
        try {
          localStorage.setItem(RIGHT_PANEL_PINNED_KEY, String(pinned))
        } catch {
          // ignore storage errors (private mode, quota)
        }
        set({ rightPanelPinned: pinned }, false, 'ui/setRightPanelPinned')
      },

      setNotificationState: (sessionId, state) =>
        set(
          (s) => ({ notificationStates: { ...s.notificationStates, [sessionId]: state } }),
          false,
          'hooks/setNotification'
        ),

      clearNotificationState: (sessionId) =>
        set(
          (s) => ({
            notificationStates: { ...s.notificationStates, [sessionId]: 'idle' as const }
          }),
          false,
          'hooks/clearNotification'
        ),

      setGitInfo: (sessionId, info) =>
        set((s) => ({ gitInfoMap: { ...s.gitInfoMap, [sessionId]: info } }), false, 'git/setInfo'),

      clearGitInfo: (sessionId) =>
        set(
          (s) => {
            const next = { ...s.gitInfoMap }
            delete next[sessionId]
            return { gitInfoMap: next }
          },
          false,
          'git/clearInfo'
        ),

      triggerOpenBranchSwitcher: () =>
        set(
          (s) => ({ openBranchSwitcherTick: s.openBranchSwitcherTick + 1 }),
          false,
          'ui/openBranchSwitcher'
        ),

      toggleEmbeddedTerminal: (sessionId) =>
        set(
          (state) => {
            const visible = state.embeddedToggleMap[sessionId] === true
            const focus = state.embeddedFocusMap[sessionId] ?? 'embedded'
            // 3-state machine:
            //   hidden                -> visible + focus=embedded
            //   visible, focus=main   -> visible + focus=embedded
            //   visible, focus=embedded -> hidden
            if (!visible) {
              setEmbeddedToggle(sessionId, true)
              return {
                embeddedToggleMap: { ...state.embeddedToggleMap, [sessionId]: true },
                embeddedFocusMap: { ...state.embeddedFocusMap, [sessionId]: 'embedded' }
              }
            }
            if (focus === 'main') {
              return {
                embeddedFocusMap: { ...state.embeddedFocusMap, [sessionId]: 'embedded' }
              }
            }
            setEmbeddedToggle(sessionId, false)
            const restToggle = { ...state.embeddedToggleMap }
            delete restToggle[sessionId]
            const restFocus = { ...state.embeddedFocusMap }
            delete restFocus[sessionId]
            return {
              embeddedToggleMap: restToggle,
              embeddedFocusMap: restFocus
            }
          },
          false,
          'ui/toggleEmbeddedTerminal'
        ),

      setEmbeddedFocus: (sessionId, side) =>
        set(
          (state) => {
            if (state.embeddedFocusMap[sessionId] === side) return state
            return {
              embeddedFocusMap: { ...state.embeddedFocusMap, [sessionId]: side }
            }
          },
          false,
          'ui/setEmbeddedFocus'
        ),

      createPlanner: async (): Promise<void> => {
        const { workspaces, sessions, activeSessionId } = useDeckStore.getState()
        const activeSession = activeSessionId
          ? sessions.find((x) => x.id === activeSessionId)
          : null
        if (!activeSession || activeSession.kind !== 'executor') return
        const workspace = workspaces.find((w) => w.id === activeSession.workspaceId)
        if (!workspace || workspace.needsSetup) return
        const session = await window.deck.session.create({
          workspaceId: activeSession.workspaceId,
          name: 'Planner',
          cwd: activeSession.cwd,
          command: '',
          kind: 'planner',
          type: 'claude-code',
          parentSessionId: activeSession.id
        })
        window.deck.session.attach({ id: session.id }).catch((err) => {
          console.error('[deck store] planner auto-attach failed:', err)
        })
      }
    }),
    { name: 'deck', enabled: import.meta.env.DEV }
  )
)

export const useWorkspaces = (): Workspace[] => useDeckStore((s) => s.workspaces)
export const useSessions = (): Session[] => useDeckStore((s) => s.sessions)
export const useActiveSessionId = (): SessionId | null => useDeckStore((s) => s.activeSessionId)
export const useSearchQuery = (): string => useDeckStore((s) => s.searchQuery)
export const useHydrated = (): boolean => useDeckStore((s) => s.hydrated)

export const useActiveSession = (): Session | null =>
  useDeckStore((s) =>
    s.activeSessionId ? (s.sessions.find((x) => x.id === s.activeSessionId) ?? null) : null
  )

export const useIsWorkspaceExpanded = (id: WorkspaceId): boolean =>
  useDeckStore((s) => !!s.expandedWorkspaceIds[id])

export const useSessionsByWorkspace = (
  wsId: WorkspaceId,
  kind: 'executor' | 'planner' = 'executor'
): Session[] =>
  useDeckStore(
    useShallow((s) => s.sessions.filter((sess) => sess.workspaceId === wsId && sess.kind === kind))
  )

export const useActiveWorkspace = (): Workspace | null =>
  useDeckStore((s) => {
    if (!s.activeSessionId) return null
    const session = s.sessions.find((x) => x.id === s.activeSessionId)
    if (!session) return null
    return s.workspaces.find((w) => w.id === session.workspaceId) ?? null
  })

export const useGitInfo = (sessionId: SessionId): GitInfo | null =>
  useDeckStore((s) => s.gitInfoMap[sessionId] ?? null)

export const useEmbeddedToggle = (sessionId: SessionId): boolean =>
  useDeckStore((s) => s.embeddedToggleMap[sessionId] === true)

export const useEmbeddedFocus = (sessionId: SessionId): EmbeddedFocusSide =>
  useDeckStore((s) => s.embeddedFocusMap[sessionId] ?? 'embedded')

export const useActivePlannerSession = (): Session | null =>
  useDeckStore((s) =>
    s.activeSessionId
      ? (s.sessions.find((x) => x.parentSessionId === s.activeSessionId && x.kind === 'planner') ??
        null)
      : null
  )

if (import.meta.env.DEV) {
  // @ts-expect-error intentional dev-only global for debugging
  window.__deck = useDeckStore
}
