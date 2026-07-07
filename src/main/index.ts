import { app, BrowserWindow, shell } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServices, registerIpc } from './ipc'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
const services = createServices(() => mainWindow)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#161512',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161512',
      symbolColor: '#c9c7c2',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Never let the renderer spawn in-app windows. Route http(s) to the OS browser
  // (safe protocols only); drop everything else (javascript:, file:, etc.).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Confine top-level navigation to the app itself — a compromised renderer must
  // not be able to navigate the window to an arbitrary (phishing/exploit) page.
  const devOrigin = process.env.ELECTRON_RENDERER_URL
    ? new URL(process.env.ELECTRON_RENDERER_URL).origin
    : null
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const withinApp = url.startsWith('file://') || (devOrigin !== null && url.startsWith(devOrigin))
    if (!withinApp) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc(services, () => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  services.sessions.closeAll()
  services.git.dispose()
  app.quit()
})

app.on('before-quit', () => {
  services.sessions.closeAll()
})
