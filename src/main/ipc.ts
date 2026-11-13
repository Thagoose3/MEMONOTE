import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { Board, Note, VaultFile } from '@shared/types'
import { readAppConfig, writeAppConfig } from './config'
import { openVault, type OpenVault } from './vaultService'
import { readVaultFile, writeVaultFile } from './vault/vaultFile'
import { downloadImage } from './net/downloadImage'

let vault: OpenVault | null = null

function need(): OpenVault {
  if (!vault) throw new Error('no-vault')
  return vault
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
}

export async function useVault(dir: string | null): Promise<void> {
  await vault?.close()
  vault = null
  if (dir) vault = await openVault(dir, (e) => broadcast('vault:external', e))
}

export async function registerIpc(): Promise<void> {
  await useVault(readAppConfig().vaultPath).catch(() => useVault(null))

  ipcMain.handle('vault:current', () => vault?.dir ?? null)
  ipcMain.handle('vault:choose', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const res = await dialog.showOpenDialog(win!, {
      title: 'เลือกโฟลเดอร์เก็บโน้ต',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || !res.filePaths[0]) return vault?.dir ?? null
    await useVault(res.filePaths[0])
    writeAppConfig({ vaultPath: res.filePaths[0] })
    return res.filePaths[0]
  })
  ipcMain.handle('vault:readFile', () => readVaultFile(need().dir))
  ipcMain.handle('vault:writeFile', (_e, v: VaultFile) => writeVaultFile(need().dir, v))

  ipcMain.handle('notes:listMeta', () => need().notes.listMeta())
  ipcMain.handle('notes:read', (_e, id: string) => need().notes.read(id))
  ipcMain.handle('notes:save', (_e, n: Note) => need().notes.save(n))
  ipcMain.handle('notes:trash', (_e, id: string) => need().notes.trash(id))
  ipcMain.handle('notes:restore', (_e, id: string) => need().notes.restore(id))
  ipcMain.handle('notes:listTrash', () => need().notes.listTrash())

  ipcMain.handle('boards:list', () => need().boards.list())
  ipcMain.handle('boards:read', (_e, id: string) => need().boards.read(id))
  ipcMain.handle('boards:save', (_e, b: Board) => need().boards.save(b))
  ipcMain.handle('boards:trash', (_e, id: string) => need().boards.trash(id))

  ipcMain.handle('assets:saveImage', (_e, bytes: Uint8Array, mime: string) => need().assets.saveImage(bytes, mime))
  ipcMain.handle('assets:downloadImage', (_e, url: string) =>
    downloadImage(url, (bytes, mime) => need().assets.saveImage(bytes, mime))
  )
}

export function currentVaultDir(): string | null {
  return vault?.dir ?? null
}
