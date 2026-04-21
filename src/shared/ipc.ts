export type PtyId = string

export const IPC = {
  PTY_SPAWN: 'pty:spawn',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_DATA: 'pty:data',
  PTY_EXIT: 'pty:exit'
} as const

export interface PtySpawnRequest {
  cwd: string
  cols: number
  rows: number
  shell?: string
  args?: string[]
  command?: string
}

export interface PtySpawnResponse {
  ptyId: PtyId
}

export interface PtyWriteRequest {
  ptyId: PtyId
  data: string
}

export interface PtyResizeRequest {
  ptyId: PtyId
  cols: number
  rows: number
}

export interface PtyKillRequest {
  ptyId: PtyId
}

export interface PtyDataEvent {
  ptyId: PtyId
  chunk: string
}

export interface PtyExitEvent {
  ptyId: PtyId
  exitCode: number
  signal?: number
}

export interface DeckPtyApi {
  spawn(req: PtySpawnRequest): Promise<PtySpawnResponse>
  write(ptyId: PtyId, data: string): void
  resize(ptyId: PtyId, cols: number, rows: number): void
  kill(ptyId: PtyId): void
  onData(ptyId: PtyId, cb: (chunk: string) => void): () => void
  onExit(ptyId: PtyId, cb: (info: Omit<PtyExitEvent, 'ptyId'>) => void): () => void
}

export interface DeckEnv {
  home: string
}

export interface DeckApi {
  env: DeckEnv
  pty: DeckPtyApi
}
