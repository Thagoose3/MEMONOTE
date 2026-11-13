import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { downloadImage } from '../../src/main/net/downloadImage'
import type { AssetRef } from '@shared/types'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

let server: Server
let base: string
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/a.png') {
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end(PNG)
    } else if (req.url === '/page') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<html></html>')
    } else if (req.url === '/huge') {
      res.writeHead(200, { 'content-type': 'image/png' })
      const chunk = Buffer.alloc(1024 * 1024)
      let sent = 0
      const pump = (): void => {
        while (sent < 25 && res.write(chunk)) sent++
        if (sent >= 25) res.end()
        else res.once('drain', pump)
      }
      pump()
      res.on('error', () => {})
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

const saver = () => {
  const calls: { bytes: Uint8Array; mime: string }[] = []
  const save = async (bytes: Uint8Array, mime: string): Promise<AssetRef> => {
    calls.push({ bytes, mime })
    return { file: 'x.png', width: 1, height: 1 }
  }
  return { calls, save }
}

describe('downloadImage', () => {
  it('saves png', async () => {
    const s = saver()
    expect(await downloadImage(`${base}/a.png`, s.save)).toEqual({ file: 'x.png', width: 1, height: 1 })
    expect(s.calls[0].mime).toBe('image/png')
    expect(Buffer.from(s.calls[0].bytes).equals(PNG)).toBe(true)
  })

  it('rejects text/html', async () => {
    await expect(downloadImage(`${base}/page`, saver().save)).rejects.toThrow('not-an-image')
  })

  it('rejects > 20MB', async () => {
    await expect(downloadImage(`${base}/huge`, saver().save)).rejects.toThrow('too-large')
  })

  it('rejects non-http urls', async () => {
    await expect(downloadImage('file:///C:/Windows/win.ini', saver().save)).rejects.toThrow('bad-url')
  })

  it('rejects http errors', async () => {
    await expect(downloadImage(`${base}/missing.png`, saver().save)).rejects.toThrow('http-404')
  })
})
