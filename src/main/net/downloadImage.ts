import type { AssetRef } from '@shared/types'

export const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
export const DOWNLOAD_TIMEOUT_MS = 20000

/** Download an image the user explicitly asked for and hand its bytes to `save`. */
export async function downloadImage(
  url: string,
  save: (bytes: Uint8Array, mime: string) => Promise<AssetRef>
): Promise<AssetRef> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('bad-url')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad-url')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS)
  try {
    const res = await fetch(parsed, { signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`http-${res.status}`)
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!mime.startsWith('image/')) throw new Error('not-an-image')
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > MAX_DOWNLOAD_BYTES) throw new Error('too-large')

    const chunks: Uint8Array[] = []
    let total = 0
    const reader = res.body!.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_DOWNLOAD_BYTES) {
        await reader.cancel().catch(() => {})
        throw new Error('too-large')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
      bytes.set(c, off)
      off += c.byteLength
    }
    return await save(bytes, mime)
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error('timeout')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
