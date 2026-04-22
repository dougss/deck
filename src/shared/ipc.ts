export type PtyId = string
export type WorkspaceId = string
export type SessionId = string
export type SessionStatus = 'idle' | 'working'

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
  WORKSPACE_UPDATED: 'workspace:updated',
  SESSION_LIST: 'session:list',
  SESSION_GET: 'session:get',
  SESSION_CREATE: 'session:create',
  SESSION_UPDATE: 'session:update',
  SESSION_DELETE: 'session:delete',
  SESSION_ATTACH: 'session:attach',
  SESSION_DETACH: 'session:detach',
  SESSION_UPDATED: 'session:updated',
  DIALOG_PICK_FOLDER: 'dialog:pick-folder',
  SHORTCUT_NEW_SESSION: 'shortcut:new-session',
  SHORTCUT_STOP_SESSION: 'shortcut:stop-session',
  SHORTCUT_SWITCH_SESSION: 'shortcut:switch-session',
  SHORTCUT_FOCUS_SEARCH: 'shortcut:focus-search',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SYSTEM_OPEN_IN_EDITOR: 'system:open-in-editor'
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

export interface Session {
  id: SessionId
  workspaceId: WorkspaceId
  name: string
  cwd: string
  command: string
  subText: string
  status: SessionStatus
  createdAt: number
  lastActiveAt: number
  ptyId: PtyId | null
  pid: number | null
}

export interface SessionCreateRequest {
  workspaceId: WorkspaceId
  name: string
  cwd: string
  command: string
  subText?: string
}

export type SessionPatch = Partial<Pick<Session, 'name' | 'cwd' | 'command' | 'subText'>>

export interface SessionUpdateRequest {
  id: SessionId
  patch: SessionPatch
}

export interface SessionGetRequest {
  id: SessionId
}

export interface SessionDeleteRequest {
  id: SessionId
}

export interface SessionListRequest {
  workspaceId?: WorkspaceId
}

export interface SessionAttachRequest {
  id: SessionId
  cols?: number
  rows?: number
}

export interface SessionDetachRequest {
  id: SessionId
}

export type SessionUpdateEvent =
  | { type: 'created'; session: Session }
  | { type: 'updated'; session: Session }
  | { type: 'deleted'; id: SessionId }

export interface DeckSessionApi {
  list(req?: SessionListRequest): Promise<Session[]>
  get(id: SessionId): Promise<Session | null>
  create(req: SessionCreateRequest): Promise<Session>
  update(req: SessionUpdateRequest): Promise<Session>
  delete(id: SessionId): Promise<void>
  attach(req: SessionAttachRequest): Promise<Session>
  detach(req: SessionDetachRequest): Promise<Session>
  onUpdated(cb: (event: SessionUpdateEvent) => void): () => void
}

export interface DeckDialogApi {
  pickFolder(): Promise<string | null>
}

export interface DeckShortcutsApi {
  onNewSession(cb: () => void): () => void
  onStopSession(cb: () => void): () => void
  onSwitchSession(cb: (n: number) => void): () => void
  onFocusSearch(cb: () => void): () => void
}

export type EditorPreset = 'zed' | 'cursor' | 'vscode' | 'custom'

export interface DeckSettings {
  preferredEditor: EditorPreset | null
  customEditorCommand: string | null
  defaultExecutorCommand: string
}

export interface OpenInEditorRequest {
  workspacePath: string
}

export interface DeckSettingsApi {
  get(): Promise<DeckSettings>
  set(patch: Partial<DeckSettings>): Promise<DeckSettings>
}

export interface DeckSystemApi {
  openInEditor(req: OpenInEditorRequest): Promise<void>
}

export interface DeckApi {
  env: DeckEnv
  pty: DeckPtyApi
  workspace: DeckWorkspaceApi
  session: DeckSessionApi
  dialog: DeckDialogApi
  shortcuts: DeckShortcutsApi
  settings: DeckSettingsApi
  system: DeckSystemApi
}
