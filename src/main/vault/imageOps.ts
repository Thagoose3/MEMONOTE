import { nativeImage } from 'electron'
import type { ImageOps } from './assets'

export const nativeImageOps: ImageOps = {
  size(bytes) {
    const img = nativeImage.createFromBuffer(Buffer.from(bytes))
    if (img.isEmpty()) throw new Error('unsupported-image')
    return img.getSize()
  },
  resize(bytes, maxSide, mime) {
    const img = nativeImage.createFromBuffer(Buffer.from(bytes))
    const { width, height } = img.getSize()
    const opts = width >= height ? { width: maxSide } : { height: maxSide }
    const out = img.resize({ ...opts, quality: 'best' })
    return new Uint8Array(mime === 'image/jpeg' ? out.toJPEG(90) : out.toPNG())
  }
}
