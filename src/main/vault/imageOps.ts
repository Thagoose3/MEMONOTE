import { nativeImage } from 'electron'
import type { ImageOps } from './assets'
import { headerSize } from './imageHeader'

/** PNG/JPEG via nativeImage; GIF/WebP sizes from their headers (never resized — see assets.ts). */
export const nativeImageOps: ImageOps = {
  size(bytes) {
    const img = nativeImage.createFromBuffer(Buffer.from(bytes))
    if (!img.isEmpty()) return img.getSize()
    const fromHeader = headerSize(bytes)
    if (!fromHeader) throw new Error('unsupported-image')
    return fromHeader
  },
  resize(bytes, maxSide, mime) {
    const img = nativeImage.createFromBuffer(Buffer.from(bytes))
    if (img.isEmpty()) return bytes
    const { width, height } = img.getSize()
    const opts = width >= height ? { width: maxSide } : { height: maxSide }
    const out = img.resize({ ...opts, quality: 'best' })
    return new Uint8Array(mime === 'image/jpeg' ? out.toJPEG(90) : out.toPNG())
  }
}
