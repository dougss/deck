import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { devtools } from 'zustand/middleware'
import type {
  Session,
  SessionId,
  SessionUpdateEvent,
  Workspace,
  WorkspaceId,
  WorkspaceUpdateEvent,
  NotificationState
} from '../../../shared/ipc'

type ExpandedMap = Record<WorkspaceId, true | undefined>
type NotificationMap = Record<SessionId, NotificationState>

type RightPanelMode = 'planner' | 'terminal'

interface DeckState {
  workspaces: Workspace[]
  sessions: Session[]

  activeSessionId: SessionId | null
  searchQuery: string
  expandedWorkspaceIds: ExpandedMap

  hydrated: boolean
  hydrationError: string | null

  newSessionDialogWorkspaceId: WorkspaceId | null
  focusSearchTick: number

  activeRightPanel: RightPanelMode | null
  lastActiveRightPanel: RightPanelMode
  rightPanelPinned: boolean

  notificationStates: NotificationMap

  hydrate: () => Promise<void>
  subscribe: () => () => void

  setActive: (id: SessionId | null) => void
  toggleWorkspace: (id: WorkspaceId) => void
  setSearch: (q: string) => void
  openNewSessionDialog: (workspaceId: WorkspaceId) => void
  closeNewSessionDialog: () => void
  triggerFocusSearch: () => void
  toggleRightPanel: (mode: RightPanelMode) => void
  setRightPanelPinned: (pinned: boolean) => void
  setNotificationState: (sessionId: SessionId, state: NotificationState) => void
  clearNotificationState: (sessionId: SessionId) => void
}

const sortWorkspaces = (ws: Workspace[]): Workspace[] =>
  [...ws].sort((a, b) => a.ordinal - b.ordinal || a.createdAt - b.createdAt)

const sortSessions = (ss: Session[]): Session[] =>
  [...ss].sort((a, b) => b.lastActiveAt - a.lastActiveAt)

const expandAll = (ws: Workspace[]): ExpandedMap => {
  const map: ExpandedMap = {}
  for (const w of ws) map[w.id] = true
  return map
}

let subscribeDispose: (() => void) | null = null

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
      focusSearchTick: 0,

      activeRightPanel: null,
      lastActiveRightPanel: 'terminal' as RightPanelMode,
      rightPanelPinned: false,

      notificationStates: {},

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
              const { [event.id]: _removed, ...restExpanded } = state.expandedWorkspaceIds
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
                return {
                  sessions: sortSessions(
                    state.sessions.map((s) => (s.id === event.session.id ? event.session : s))
                  )
                }
              }
              return {
                sessions: state.sessions.filter((s) => s.id !== event.id),
                activeSessionId: state.activeSessionId === event.id ? null : state.activeSessionId
              }
            },
            false,
            `session/${event.type}`
          )
        })

        const unsubHooks = window.deck.hooks.onEvent((payload) => {
          set(
            (state) => {
              // Active session is already visible — no dot needed
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

      openNewSessionDialog: (workspaceId) =>
        set({ newSessionDialogWorkspaceId: workspaceId }, false, 'ui/openNewSessionDialog'),

      closeNewSessionDialog: () =>
        set({ newSessionDialogWorkspaceId: null }, false, 'ui/closeNewSessionDialog'),

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

      setRightPanelPinned: (pinned) =>
        set({ rightPanelPinned: pinned }, false, 'ui/setRightPanelPinned'),

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
        )
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

if (import.meta.env.DEV) {
  // @ts-expect-error intentional dev-only global for debugging
  window.__deck = useDeckStore
}
