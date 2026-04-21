import { contextBridge, ipcRenderer } from 'electron'
import { homedir } from 'node:os'
import {
  IPC,
  type DeckApi,
  type PtyDataEvent,
  type PtyExitEvent,
  type PtyId,
  type PtySpawnRequest,
  type PtySpawnResponse
} from '../shared/ipc'

type DataListener = (chunk: string) => void
type ExitListener = (info: Omit<PtyExitEvent, 'ptyId'>) => void

const dataListeners = new Map<PtyId, Set<DataListener>>()
const exitListeners = new Map<PtyId, Set<ExitListener>>()

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

const deck: DeckApi = {
  env: {
    home: homedir()
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
  }
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
