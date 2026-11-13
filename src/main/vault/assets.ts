import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { AssetRef } from '@shared/types'
import { writeFileAtomic } from './fsAtomic'

export interface ImageOps {
  size(bytes: Uint8Array): { width: number; height: number }
  /** Returns encoded bytes (same format family as `mime`) whose longest side is `maxSide`. */
  resize(bytes: Uint8Array, maxSide: number, mime: string): Uint8Array
}

export const MAX_SIDE = 4000
export const THUMB_SIDE = 400

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp'
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(
    () => true,
    () => false
  )
}

function scaled(w: number, h: number, maxSide: number): { width: number; height: number } {
  const k = maxSide / Math.max(w, h)
  return { width: Math.round(w * k), height: Math.round(h * k) }
}

export function createAssets(vaultDir: string, ops: ImageOps, onWrite: (p: string) => void = () => {}) {
  const dir = join(vaultDir, 'assets')
  const thumbs = join(dir, '.thumbs')
  return {
    async saveImage(bytes: Uint8Array, mime: string): Promise<AssetRef> {
      const ext = EXT[mime]
      if (!ext) throw new Error('unsupported-image')
      const file = `${createHash('sha256').update(bytes).digest('hex')}.${ext}`
      const { width, height } = ops.size(bytes)
      const big = Math.max(width, height) > MAX_SIDE && ext !== 'gif'
      const dims = big ? scaled(width, height, MAX_SIDE) : { width, height }
      const target = join(dir, file)
      if (!(await exists(target))) {
        onWrite(target)
        await writeFileAtomic(target, big ? ops.resize(bytes, MAX_SIDE, mime) : bytes)
      }
      const thumb = join(thumbs, file)
      if (!(await exists(thumb))) {
        const small = Math.max(width, height) <= THUMB_SIDE || ext === 'gif'
        await writeFileAtomic(thumb, small ? bytes : ops.resize(bytes, THUMB_SIDE, mime))
      }
      return { file, ...dims }
    }
  }
}

export type Assets = ReturnType<typeof createAssets>
