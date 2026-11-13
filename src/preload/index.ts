import { contextBridge, ipcRenderer } from 'electron'
import type { ExternalChange, Storage } from '@shared/types'

const call =
  (channel: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args)

const flushHandlers = new Set<() => Promise<void>>()
ipcRenderer.on('app:flush', async () => {
  try {
    await Promise.all([...flushHandlers].map((h) => h()))
  } finally {
    ipcRenderer.send('app:flushed')
  }
})

const memo: Storage = {
  vault: {
    current: call('vault:current'),
    choose: call('vault:choose'),
    readFile: call('vault:readFile'),
    writeFile: call('vault:writeFile')
  } as Storage['vault'],
  notes: {
    listMeta: call('notes:listMeta'),
    read: call('notes:read'),
    save: call('notes:save'),
    trash: call('notes:trash'),
    restore: call('notes:restore'),
    listTrash: call('notes:listTrash')
  } as Storage['notes'],
  boards: {
    list: call('boards:list'),
    read: call('boards:read'),
    save: call('boards:save'),
    trash: call('boards:trash')
  } as Storage['boards'],
  assets: {
    saveImage: call('assets:saveImage'),
    downloadImage: call('assets:downloadImage')
  } as Storage['assets'],
  onExternalChange(cb) {
    const h = (_e: unknown, change: ExternalChange): void => cb(change)
    ipcRenderer.on('vault:external', h)
    return () => ipcRenderer.removeListener('vault:external', h)
  },
  onFlushRequest(cb) {
    flushHandlers.add(cb)
    return () => flushHandlers.delete(cb)
  }
}

contextBridge.exposeInMainWorld('memo', memo)
