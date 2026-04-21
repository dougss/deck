import { app, shell, BrowserWindow } from 'electron'
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

type SmokeKind = 'db' | 'ws' | 'session'

function parseSmokeKind(argv: string[]): SmokeKind | null {
  for (const arg of argv) {
    if (arg === '--deck-smoke') return 'db'
    if (arg.startsWith('--deck-smoke=')) {
      const kind = arg.slice('--deck-smoke='.length)
      if (kind === 'db' || kind === 'ws' || kind === 'session') return kind
      return null
    }
  }
  return null
}

const smokeKind = parseSmokeKind(process.argv)

app.setName('Deck')
app.setPath('userData', join(app.getPath('appData'), 'Deck'))

const ptyRegistry = new PtyRegistry()
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: '#09090b',
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

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const dbPath = join(app.getPath('userData'), 'deck.db')
  const { db } = initDatabase(dbPath)

  const workspaceManager = new WorkspaceManager(db)
  const sessionManager = new SessionManager(db, ptyRegistry)
  registerWorkspaceHandlers(workspaceManager, sessionManager, () => mainWindow)
  registerSessionHandlers(sessionManager, () => mainWindow)
  registerPtyHandlers(ptyRegistry, () => mainWindow)

  createWindow()

  queueMicrotask(() => {
    try {
      const { changed } = workspaceManager.checkPaths()
      if (changed.length > 0) {
        console.log(`[workspace] checkPaths: ${changed.length} changed`)
      }
    } catch (err) {
      console.error('[workspace] checkPaths failed', err)
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  ptyRegistry.killAll()
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
