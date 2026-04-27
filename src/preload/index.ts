import { contextBridge, ipcRenderer } from 'electron'
import { homedir } from 'node:os'
import {
  IPC,
  type DeckApi,
  type DeckSettings,
  type DeckSettingsApi,
  type DeckSystemApi,
  type DeckHooksApi,
  type HookEventPayload,
  type HookInstanceStatus,
  type OpenInEditorRequest,
  type PtyDataEvent,
  type PtyExitEvent,
  type PtyId,
  type PtySpawnRequest,
  type PtySpawnResponse,
  type SessionUpdateEvent,
  type WorkspaceUpdateEvent,
  type DeckShortcutsApi
} from '../shared/ipc'

type DataListener = (chunk: string) => void
type ExitListener = (info: Omit<PtyExitEvent, 'ptyId'>) => void
type WorkspaceUpdateListener = (event: WorkspaceUpdateEvent) => void
type SessionUpdateListener = (event: SessionUpdateEvent) => void
type HookEventListener = (payload: HookEventPayload) => void

const dataListeners = new Map<PtyId, Set<DataListener>>()
const exitListeners = new Map<PtyId, Set<ExitListener>>()
const workspaceUpdateListeners = new Set<WorkspaceUpdateListener>()
const sessionUpdateListeners = new Set<SessionUpdateListener>()
const hookEventListeners = new Set<HookEventListener>()

ipcRenderer.on(IPC.PTY_DATA, (_event, payload: PtyDataEvent) => {
  const set = dataListeners.get(payload.ptyId)
  if (!set) return
  for (const cb of set) cb(payload.chunk)
})

ipcRenderer.on(IPC.PTY_EXIT, (_event, payload: PtyExitEvent) => {
  const set = exitListeners.get(payload.ptyId)
  if (!set) return
  const info = { exitCode: payload.exitCode, signal: payload.signal }
  for (const cb of set) cb(info)
})

ipcRenderer.on(IPC.WORKSPACE_UPDATED, (_event, event: WorkspaceUpdateEvent) => {
  for (const cb of workspaceUpdateListeners) {
    try {
      cb(event)
    } catch (err) {
      console.error('[preload] workspace:updated listener threw:', err)
    }
  }
})

ipcRenderer.on(IPC.SESSION_UPDATED, (_event, event: SessionUpdateEvent) => {
  for (const cb of sessionUpdateListeners) {
    try {
      cb(event)
    } catch (err) {
      console.error('[preload] session:updated listener threw:', err)
    }
  }
})

ipcRenderer.on(IPC.HOOK_EVENT_RECEIVED, (_event, payload: HookEventPayload) => {
  for (const cb of hookEventListeners) {
    try {
      cb(payload)
    } catch (err) {
      console.error('[preload] hooks:event-received listener threw:', err)
    }
  }
})

const deck: DeckApi = {
  env: {
    home: homedir(),
    shell: process.env.SHELL ?? '/bin/zsh'
  },
  pty: {
    spawn(req: PtySpawnRequest): Promise<PtySpawnResponse> {
      return ipcRenderer.invoke(IPC.PTY_SPAWN, req)
    },
    write(ptyId, data) {
      ipcRenderer.send(IPC.PTY_WRITE, { ptyId, data })
    },
    resize(ptyId, cols, rows) {
      ipcRenderer.send(IPC.PTY_RESIZE, { ptyId, cols, rows })
    },
    kill(ptyId) {
      ipcRenderer.send(IPC.PTY_KILL, { ptyId })
    },
    onData(ptyId, cb) {
      let set = dataListeners.get(ptyId)
      if (!set) {
        set = new Set()
        dataListeners.set(ptyId, set)
      }
      set.add(cb)
      return () => {
        const s = dataListeners.get(ptyId)
        if (!s) return
        s.delete(cb)
        if (s.size === 0) dataListeners.delete(ptyId)
      }
    },
    onExit(ptyId, cb) {
      let set = exitListeners.get(ptyId)
      if (!set) {
        set = new Set()
        exitListeners.set(ptyId, set)
      }
      set.add(cb)
      return () => {
        const s = exitListeners.get(ptyId)
        if (!s) return
        s.delete(cb)
        if (s.size === 0) exitListeners.delete(ptyId)
      }
    }
  },
  workspace: {
    list() {
      return ipcRenderer.invoke(IPC.WORKSPACE_LIST)
    },
    get(id) {
      return ipcRenderer.invoke(IPC.WORKSPACE_GET, { id })
    },
    create(req) {
      return ipcRenderer.invoke(IPC.WORKSPACE_CREATE, req)
    },
    update(req) {
      return ipcRenderer.invoke(IPC.WORKSPACE_UPDATE, req)
    },
    delete(id) {
      return ipcRenderer.invoke(IPC.WORKSPACE_DELETE, { id })
    },
    checkPaths() {
      return ipcRenderer.invoke(IPC.WORKSPACE_CHECK_PATHS)
    },
    onUpdated(cb) {
      workspaceUpdateListeners.add(cb)
      return () => {
        workspaceUpdateListeners.delete(cb)
      }
    }
  },
  session: {
    list(req) {
      return ipcRenderer.invoke(IPC.SESSION_LIST, req ?? {})
    },
    get(id) {
      return ipcRenderer.invoke(IPC.SESSION_GET, { id })
    },
    create(req) {
      return ipcRenderer.invoke(IPC.SESSION_CREATE, req)
    },
    update(req) {
      return ipcRenderer.invoke(IPC.SESSION_UPDATE, req)
    },
    delete(id) {
      return ipcRenderer.invoke(IPC.SESSION_DELETE, { id })
    },
    attach(req) {
      return ipcRenderer.invoke(IPC.SESSION_ATTACH, req)
    },
    detach(req) {
      return ipcRenderer.invoke(IPC.SESSION_DETACH, req)
    },
    onUpdated(cb) {
      sessionUpdateListeners.add(cb)
      return () => {
        sessionUpdateListeners.delete(cb)
      }
    }
  },
  dialog: {
    pickFolder(): Promise<string | null> {
      return ipcRenderer.invoke(IPC.DIALOG_PICK_FOLDER)
    }
  },
  shortcuts: {
    onNewSession(cb) {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.SHORTCUT_NEW_SESSION, listener)
      return () => ipcRenderer.removeListener(IPC.SHORTCUT_NEW_SESSION, listener)
    },
    onStopSession(cb) {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.SHORTCUT_STOP_SESSION, listener)
      return () => ipcRenderer.removeListener(IPC.SHORTCUT_STOP_SESSION, listener)
    },
    onSwitchSession(cb) {
      const listener = (_ev: Electron.IpcRendererEvent, n: number): void => cb(n)
      ipcRenderer.on(IPC.SHORTCUT_SWITCH_SESSION, listener)
      return () => ipcRenderer.removeListener(IPC.SHORTCUT_SWITCH_SESSION, listener)
    },
    onFocusSearch(cb) {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.SHORTCUT_FOCUS_SEARCH, listener)
      return () => ipcRenderer.removeListener(IPC.SHORTCUT_FOCUS_SEARCH, listener)
    },
    onTogglePanel(cb) {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.SHORTCUT_TOGGLE_PANEL, listener)
      return () => ipcRenderer.removeListener(IPC.SHORTCUT_TOGGLE_PANEL, listener)
    }
  } satisfies DeckShortcutsApi,
  settings: {
    get(): Promise<DeckSettings> {
      return ipcRenderer.invoke(IPC.SETTINGS_GET)
    },
    set(patch: Partial<DeckSettings>): Promise<DeckSettings> {
      return ipcRenderer.invoke(IPC.SETTINGS_SET, patch)
    }
  } satisfies DeckSettingsApi,
  system: {
    openInEditor(req: OpenInEditorRequest): Promise<void> {
      return ipcRenderer.invoke(IPC.SYSTEM_OPEN_IN_EDITOR, req)
    },
    openExternal(url: string): Promise<void> {
      return ipcRenderer.invoke(IPC.SYSTEM_OPEN_EXTERNAL, url)
    }
  } satisfies DeckSystemApi,
  hooks: {
    getStatus(instancePaths?: string[]): Promise<HookInstanceStatus[]> {
      return ipcRenderer.invoke(IPC.HOOKS_GET_STATUS, instancePaths)
    },
    install(instancePaths?: string[]): Promise<HookInstanceStatus[]> {
      return ipcRenderer.invoke(IPC.HOOKS_INSTALL, instancePaths)
    },
    uninstall(instancePaths?: string[]): Promise<HookInstanceStatus[]> {
      return ipcRenderer.invoke(IPC.HOOKS_UNINSTALL, instancePaths)
    },
    onEvent(cb: HookEventListener) {
      hookEventListeners.add(cb)
      return () => {
        hookEventListeners.delete(cb)
      }
    }
  } satisfies DeckHooksApi
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('deck', deck)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore declared in renderer types
  window.deck = deck
}
