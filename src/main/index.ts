import { app, BrowserWindow, ipcMain, nativeTheme, net, protocol, session, shell } from 'electron'
import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { currentVaultDir, registerIpc } from './ipc'

const CSP =
  "default-src 'self'; img-src 'self' memo-asset: data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'"
const FLUSH_TIMEOUT_MS = 3000

protocol.registerSchemesAsPrivileged([
  { scheme: 'memo-asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function overlayColors(): { color: string; symbolColor: string; height: number } {
  return nativeTheme.shouldUseDarkColors
    ? { color: '#1b1c1f', symbolColor: '#e6e6e6', height: 40 }
    : { color: '#f7f7f8', symbolColor: '#1f1f1f', height: 40 }
}

/** memo-asset://a/<file> -> <vault>/assets/<file>, memo-asset://t/<file> -> <vault>/assets/.thumbs/<file> */
function registerAssetProtocol(): void {
  protocol.handle('memo-asset', (req) => {
    const vault = currentVaultDir()
    const url = new URL(req.url)
    const file = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const base = url.hostname === 't' ? join(vault ?? '', 'assets', '.thumbs') : join(vault ?? '', 'assets')
    const full = normalize(join(base, file))
    if (!vault || !file || file.includes('..') || !full.startsWith(base + sep)) {
      return new Response('not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(full).toString())
  })
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

  // The app page must never be replaced (stray file drops, links) and must never spawn windows that
  // would inherit the preload bridge. Web links open in the user's browser instead.
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  const onTheme = (): void => {
    if (!win.isDestroyed()) win.setTitleBarOverlay(overlayColors())
  }
  nativeTheme.on('updated', onTheme)
  win.on('closed', () => nativeTheme.off('updated', onTheme))

  // Flush pending autosaves before the window goes away.
  let flushed = false
  win.on('close', (e) => {
    if (flushed || win.webContents.isDestroyed()) return
    e.preventDefault()
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      flushed = true
      ipcMain.removeListener('app:flushed', onFlushed)
      if (!win.isDestroyed()) win.destroy()
    }
    const onFlushed = (ev: Electron.IpcMainEvent): void => {
      if (ev.sender === win.webContents) finish()
    }
    ipcMain.on('app:flushed', onFlushed)
    setTimeout(finish, FLUSH_TIMEOUT_MS)
    win.webContents.send('app:flush')
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

app.whenReady().then(async () => {
  if (!process.env.ELECTRON_RENDERER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } })
    })
  }
  registerAssetProtocol()
  await registerIpc()
  createWindow()
})

app.on('window-all-closed', () => app.quit())
