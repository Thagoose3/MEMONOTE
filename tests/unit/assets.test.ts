import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createAssets, type ImageOps } from '../../src/main/vault/assets'
import { initVault } from '../../src/main/vault/vaultFile'
import { tempDir } from './helpers'

class FakeOps implements ImageOps {
  resizeCalls: { maxSide: number; mime: string }[] = []
  constructor(private w: number, private h: number) {}
  size() {
    return { width: this.w, height: this.h }
  }
  resize(bytes: Uint8Array, maxSide: number, mime: string): Uint8Array {
    this.resizeCalls.push({ maxSide, mime })
    return new Uint8Array([...bytes, maxSide % 256])
  }
}

const bytes = new Uint8Array([1, 2, 3, 4])
const sha = createHash('sha256').update(bytes).digest('hex')
let dir: string
beforeEach(async () => {
  dir = tempDir('assets')
  await initVault(dir)
})

describe('assets.saveImage', () => {
  it('same bytes saved twice -> one file, same ref', async () => {
    const a = createAssets(dir, new FakeOps(100, 50))
    const r1 = await a.saveImage(bytes, 'image/png')
    const r2 = await a.saveImage(bytes, 'image/png')
    expect(r1).toEqual(r2)
    expect(r1).toEqual({ file: `${sha}.png`, width: 100, height: 50 })
    expect(readdirSync(join(dir, 'assets')).filter((f) => f !== '.thumbs')).toEqual([`${sha}.png`])
  })

  it('maps mime to extension', async () => {
    const a = createAssets(dir, new FakeOps(10, 10))
    expect((await a.saveImage(bytes, 'image/jpeg')).file).toBe(`${sha}.jpg`)
    expect((await a.saveImage(bytes, 'image/webp')).file).toBe(`${sha}.webp`)
  })

  it('8000x5000 png is resized to max side 4000', async () => {
    const ops = new FakeOps(8000, 5000)
    const ref = await createAssets(dir, ops).saveImage(bytes, 'image/png')
    expect(ops.resizeCalls).toContainEqual({ maxSide: 4000, mime: 'image/png' })
    expect(ref).toMatchObject({ width: 4000, height: 2500 })
  })

  it('gif is never resized', async () => {
    const ops = new FakeOps(8000, 5000)
    const ref = await createAssets(dir, ops).saveImage(bytes, 'image/gif')
    expect(ops.resizeCalls).toEqual([])
    expect(ref).toEqual({ file: `${sha}.gif`, width: 8000, height: 5000 })
  })

  it('thumbnail written to assets/.thumbs with max side 400', async () => {
    const ops = new FakeOps(1000, 800)
    const ref = await createAssets(dir, ops).saveImage(bytes, 'image/png')
    expect(ops.resizeCalls).toContainEqual({ maxSide: 400, mime: 'image/png' })
    expect(existsSync(join(dir, 'assets', '.thumbs', ref.file))).toBe(true)
  })

  it('unsupported mime rejects with unsupported-image', async () => {
    await expect(createAssets(dir, new FakeOps(1, 1)).saveImage(bytes, 'text/html')).rejects.toThrow('unsupported-image')
  })
})
