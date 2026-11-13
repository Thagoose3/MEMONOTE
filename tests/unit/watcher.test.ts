import { describe, it, expect, vi, afterEach } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSelfWriteFilter, watchVault } from '../../src/main/vault/watcher'
import { initVault } from '../../src/main/vault/vaultFile'
import type { ExternalChange } from '@shared/types'
import { tempDir } from './helpers'

afterEach(() => vi.useRealTimers())

describe('createSelfWriteFilter', () => {
  it('isSelf true right after mark, false after window', () => {
    vi.useFakeTimers()
    const f = createSelfWriteFilter(1500)
    f.mark('C:\\v\\notes\\A.json')
    expect(f.isSelf('C:\\v\\notes\\A.json')).toBe(true)
    expect(f.isSelf('C:\\v\\notes\\B.json')).toBe(false)
    vi.advanceTimersByTime(1600)
    expect(f.isSelf('C:\\v\\notes\\A.json')).toBe(false)
  })
})

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('watchVault', () => {
  it('external write emits changed, self write emits nothing', async () => {
    const dir = tempDir('watch')
    await initVault(dir)
    const events: ExternalChange[] = []
    const filter = createSelfWriteFilter()
    const stop = await watchVault(dir, filter, (e) => events.push(e))
    try {
      const selfPath = join(dir, 'notes', 'SELF.json')
      filter.mark(selfPath)
      writeFileSync(selfPath, '{}')
      writeFileSync(join(dir, 'notes', 'EXT.json'), '{}')
      writeFileSync(join(dir, 'boards', 'BRD.json'), '{}')
      writeFileSync(join(dir, 'notes', 'x.json.1.0.tmp'), '{}')
      for (let i = 0; i < 40 && events.length < 2; i++) await wait(100)
      await wait(300)
      expect(events).toContainEqual({ kind: 'note', id: 'EXT', change: 'changed' })
      expect(events).toContainEqual({ kind: 'board', id: 'BRD', change: 'changed' })
      expect(events.find((e) => e.id === 'SELF')).toBeUndefined()
      expect(events).toHaveLength(2)
    } finally {
      await stop()
    }
  })
})
