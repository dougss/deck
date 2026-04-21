import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { PtyRegistry } from './pty-registry'
import { registerPtyHandlers } from './ipc-handlers'
import { initDatabase } from './db'
import { runSmoke } from './db/smoke'

const SMOKE_FLAG = '--deck-smoke'
const isSmoke = process.argv.includes(SMOKE_FLAG)

const ptyRegistry = new PtyRegistry()
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    autoHideMenuBar: true,
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
  if (isSmoke) {
    const code = await runSmoke()
    app.exit(code)
    return
  }

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const dbPath = join(app.getPath('userData'), 'deck.db')
  initDatabase(dbPath)

  registerPtyHandlers(ptyRegistry, () => mainWindow)

  createWindow()

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
