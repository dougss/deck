import { app, shell, BrowserWindow, Menu } from 'electron'
import { IPC } from '../shared/ipc'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { PtyRegistry } from './pty-registry'
import { registerPtyHandlers } from './ipc-handlers'
import { initDatabase } from './db'
import { runSmoke } from './db/smoke'
import { WorkspaceManager } from './workspace-manager'
import { registerWorkspaceHandlers } from './ipc-handlers-workspaces'
import { runWsSmoke } from './ws-smoke'
import { SessionManager } from './session-manager'
import { registerSessionHandlers } from './ipc-handlers-sessions'
import { runSessionSmoke } from './session-smoke'
import { registerDialogHandlers } from './ipc-handlers-dialog'
import { registerSettingsHandlers } from './ipc-handlers-settings'
import { getSettings } from './settings-manager'
import { registerSystemHandlers } from './ipc-handlers-system'
import { buildApplicationMenu } from './menu'
import { EventWatcher, DECK_DIR } from './event-watcher'
import { registerHookHandlers } from './ipc-handlers-hooks'
import { GitManager } from './git-manager'
import { GitDiffManager } from './git-diff-manager'
import { registerGitHandlers } from './ipc-handlers-git'
import { registerSshHandlers } from './ipc-handlers-ssh'
import { runSshSmoke } from './ssh-smoke'
import { mkdirSync } from 'node:fs'

type SmokeKind = 'db' | 'ws' | 'session' | 'ssh'

function parseSmokeKind(argv: string[]): SmokeKind | null {
  for (const arg of argv) {
    if (arg === '--deck-smoke') return 'db'
    if (arg.startsWith('--deck-smoke=')) {
      const kind = arg.slice('--deck-smoke='.length)
      if (kind === 'db' || kind === 'ws' || kind === 'session' || kind === 'ssh') return kind
      return null
    }
  }
  return null
}

const smokeKind = parseSmokeKind(process.argv)

app.setName('Deck')
app.setPath('userData', join(app.getPath('appData'), 'Deck'))

const ptyRegistry = new PtyRegistry()
const eventWatcher = new EventWatcher()
let mainWindow: BrowserWindow | null = null
let pathCheckInterval: ReturnType<typeof setInterval> | null = null
let gitDiffManagerRef: GitDiffManager | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: '#09090b',
    acceptFirstMouse: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (smokeKind === 'db') {
    const code = await runSmoke()
    app.exit(code)
    return
  }
  if (smokeKind === 'ws') {
    const code = await runWsSmoke()
    app.exit(code)
    return
  }
  if (smokeKind === 'session') {
    const code = await runSessionSmoke()
    app.exit(code)
    return
  }
  if (smokeKind === 'ssh') {
    const code = await runSshSmoke()
    app.exit(code)
    return
  }

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const dbPath = join(app.getPath('userData'), 'deck.db')
  const { db } = initDatabase(dbPath)

  const workspaceManager = new WorkspaceManager(db)
  const sessionManager = new SessionManager(db, ptyRegistry, getSettings)
  const gitManager = new GitManager()
  const gitDiffManager = new GitDiffManager()
  gitDiffManagerRef = gitDiffManager
  registerWorkspaceHandlers(workspaceManager, sessionManager, () => mainWindow)
  registerSessionHandlers(sessionManager, () => mainWindow)
  registerPtyHandlers(ptyRegistry, () => mainWindow)
  registerDialogHandlers(() => mainWindow)
  registerSettingsHandlers()
  registerSystemHandlers()
  registerHookHandlers()
  registerGitHandlers(gitManager, gitDiffManager, sessionManager, () => mainWindow)
  registerSshHandlers()

  // Ensure ~/.deck/ exists before starting event watcher
  mkdirSync(DECK_DIR, { recursive: true, mode: 0o755 })

  // Wire hook events: match session and forward to renderer.
  // Priority: exact session ID match (via DECK_SESSION_ID env var injected at PTY spawn).
  // Fallback: cwd-broadcast to all sessions in the matching workspace (back-compat with
  // old hook-handler or sessions spawned before the DECK_SESSION_ID injection).
  eventWatcher.on('hookEvent', ({ cwd, event, sessionId }) => {
    const win = mainWindow
    if (!win || win.isDestroyed()) return

    const notificationState = event === 'error' ? 'error' : 'pending'

    if (sessionId) {
      const session = sessionManager.get(sessionId)
      if (session) {
        win.webContents.send(IPC.HOOK_EVENT_RECEIVED, { sessionId: session.id, notificationState })
        return
      }
      // Session not found (deleted while running?) — fall through to cwd-broadcast
    }

    const normalizedCwd = cwd.replace(/\/$/, '').toLowerCase()
    const matchedWorkspaceIds = workspaceManager
      .list()
      .filter((w) => {
        const wPath = w.path.replace(/\/$/, '').toLowerCase()
        return wPath === normalizedCwd || normalizedCwd.startsWith(wPath + '/')
      })
      .map((w) => w.id)

    if (matchedWorkspaceIds.length === 0) return

    const targetSessions = sessionManager
      .list()
      .filter((s) => matchedWorkspaceIds.includes(s.workspaceId))

    for (const session of targetSessions) {
      win.webContents.send(IPC.HOOK_EVENT_RECEIVED, { sessionId: session.id, notificationState })
    }
  })

  eventWatcher.start()

  createWindow()
  if (mainWindow) Menu.setApplicationMenu(buildApplicationMenu(mainWindow))

  let lastPathCheck = 0
  function runPathCheck(): void {
    const now = Date.now()
    if (now - lastPathCheck < 5_000) return
    lastPathCheck = now
    try {
      const { changed } = workspaceManager.checkPaths()
      if (changed.length > 0) {
        console.log(`[workspace] checkPaths: ${changed.length} changed`)
      }
    } catch (err) {
      console.error('[workspace] checkPaths failed', err)
    }
  }

  queueMicrotask(runPathCheck)
  pathCheckInterval = setInterval(runPathCheck, 60_000)
  app.on('browser-window-focus', runPathCheck)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  if (pathCheckInterval !== null) clearInterval(pathCheckInterval)
  eventWatcher.stop()
  ptyRegistry.killAll()
  gitDiffManagerRef?.dispose().catch(() => {})
})

app.on('window-all-closed', () => {
  ptyRegistry.killAll()
  app.quit()
})

const shutdown = (): void => {
  ptyRegistry.killAll()
  app.quit()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGHUP', shutdown)
