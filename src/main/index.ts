import { app, BrowserWindow, nativeTheme, session } from 'electron'
import { join } from 'node:path'

const CSP =
  "default-src 'self'; img-src 'self' memo-asset: data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'"

function overlayColors(): { color: string; symbolColor: string; height: number } {
  return nativeTheme.shouldUseDarkColors
    ? { color: '#1b1c1f', symbolColor: '#e6e6e6', height: 40 }
    : { color: '#f7f7f8', symbolColor: '#1f1f1f', height: 40 }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 420,
    show: false,
    title: 'MEMONOTE',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1b1c1f' : '#ffffff',
    titleBarStyle: 'hidden',
    titleBarOverlay: overlayColors(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true
    }
  })
  win.setMenuBarVisibility(false)
  win.once('ready-to-show', () => win.show())
  nativeTheme.on('updated', () => {
    if (!win.isDestroyed()) win.setTitleBarOverlay(overlayColors())
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  if (!process.env.ELECTRON_RENDERER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } })
    })
  }
  createWindow()
})

app.on('window-all-closed', () => app.quit())
