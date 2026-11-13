import { describe, it, expect } from 'vitest'
import { headerSize } from '../../src/main/vault/imageHeader'

const b64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'))

describe('headerSize', () => {
  it('reads GIF logical screen size', () => {
    expect(headerSize(b64('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'))).toEqual({ width: 1, height: 1 })
    const g = new Uint8Array(13)
    g.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x1f, 0x88, 0x13])
    expect(headerSize(g)).toEqual({ width: 8000, height: 5000 })
  })

  it('reads lossy WebP (VP8)', () => {
    expect(headerSize(b64('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='))).toEqual({ width: 1, height: 1 })
  })

  it('reads lossless WebP (VP8L)', () => {
    expect(headerSize(b64('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='))).toEqual({ width: 1, height: 1 })
  })

  it('reads extended WebP (VP8X)', () => {
    const x = new Uint8Array(30)
    x.set([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8X')])
    // canvas width-1 = 4999 (24 bit LE) at 24, height-1 = 2999 at 27
    x.set([0x87, 0x13, 0x00, 0xb7, 0x0b, 0x00], 24)
    expect(headerSize(x)).toEqual({ width: 5000, height: 3000 })
  })

  it('returns null for unknown data', () => {
    expect(headerSize(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})
