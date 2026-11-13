import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomic, readJson } from '../../src/main/vault/fsAtomic'
import { tempDir } from './helpers'

describe('fsAtomic', () => {
  it('writeFileAtomic leaves no .tmp and replaces content', async () => {
    const dir = tempDir()
    const p = join(dir, 'a.json')
    await writeFileAtomic(p, 'one')
    await writeFileAtomic(p, 'two')
    expect(readFileSync(p, 'utf8')).toBe('two')
    expect(readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('readJson throws on corrupt json', async () => {
    const dir = tempDir()
    const p = join(dir, 'b.json')
    await writeFileAtomic(p, '{"id":')
    await expect(readJson(p)).rejects.toThrow()
  })
})
