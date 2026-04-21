export type PtyId = string
export type WorkspaceId = string

export const IPC = {
  PTY_SPAWN: 'pty:spawn',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_DATA: 'pty:data',
  PTY_EXIT: 'pty:exit',
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_GET: 'workspace:get',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_CHECK_PATHS: 'workspace:check-paths',
  WORKSPACE_UPDATED: 'workspace:updated'
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

export interface Workspace {
  id: WorkspaceId
  name: string
  accentColor: string
  path: string
  needsSetup: boolean
  ordinal: number
  createdAt: number
}

export interface WorkspaceCreateRequest {
  name: string
  accentColor: string
  path: string
  ordinal?: number
}

export type WorkspacePatch = Partial<Pick<Workspace, 'name' | 'accentColor' | 'path' | 'ordinal'>>

export interface WorkspaceUpdateRequest {
  id: WorkspaceId
  patch: WorkspacePatch
}

export interface WorkspaceGetRequest {
  id: WorkspaceId
}

export interface WorkspaceDeleteRequest {
  id: WorkspaceId
}

export type WorkspaceUpdateEvent =
  | { type: 'created'; workspace: Workspace }
  | { type: 'updated'; workspace: Workspace }
  | { type: 'deleted'; id: WorkspaceId }

export interface WorkspaceCheckPathsResult {
  changed: Workspace[]
}

export interface DeckWorkspaceApi {
  list(): Promise<Workspace[]>
  get(id: WorkspaceId): Promise<Workspace | null>
  create(req: WorkspaceCreateRequest): Promise<Workspace>
  update(req: WorkspaceUpdateRequest): Promise<Workspace>
  delete(id: WorkspaceId): Promise<void>
  checkPaths(): Promise<WorkspaceCheckPathsResult>
  onUpdated(cb: (event: WorkspaceUpdateEvent) => void): () => void
}

export interface DeckApi {
  env: DeckEnv
  pty: DeckPtyApi
  // TODO(task-5): remove ? when preload bridge lands
  workspace?: DeckWorkspaceApi
}
