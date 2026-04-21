import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  Session,
  SessionId,
  SessionUpdateEvent,
  Workspace,
  WorkspaceId,
  WorkspaceUpdateEvent
} from '../../../shared/ipc'

type ExpandedMap = Record<WorkspaceId, true | undefined>

interface DeckState {
  workspaces: Workspace[]
  sessions: Session[]

  activeSessionId: SessionId | null
  searchQuery: string
  expandedWorkspaceIds: ExpandedMap

  hydrated: boolean
  hydrationError: string | null

  hydrate: () => Promise<void>
  subscribe: () => () => void

  setActive: (id: SessionId | null) => void
  toggleWorkspace: (id: WorkspaceId) => void
  setSearch: (q: string) => void
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

        subscribeDispose = () => {
          unsubWs()
          unsubSess()
          subscribeDispose = null
        }
        return subscribeDispose
      },

      setActive: (id) => set({ activeSessionId: id }, false, 'ui/setActive'),

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

      setSearch: (q) => set({ searchQuery: q }, false, 'ui/setSearch')
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

if (import.meta.env.DEV) {
  // @ts-expect-error intentional dev-only global for debugging
  window.__deck = useDeckStore
}
