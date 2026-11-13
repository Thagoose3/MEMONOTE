import { describe, it, expect, beforeEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createNotesRepo } from '../../src/main/vault/notesRepo'
import { initVault, readVaultFile, writeVaultFile } from '../../src/main/vault/vaultFile'
import { CONFLICT_SUFFIX } from '@shared/types'
import { doc, makeNote, para, tempDir } from './helpers'

let dir: string
beforeEach(async () => {
  dir = tempDir('notes')
  await initVault(dir)
})

describe('notesRepo', () => {
  it('initVault creates folders and vault.json', async () => {
    for (const d of ['notes', 'boards', 'assets', 'assets/.thumbs', '.trash']) expect(existsSync(join(dir, d))).toBe(true)
    expect(await readVaultFile(dir)).toEqual({ version: 1, folders: [] })
    await writeVaultFile(dir, { version: 1, folders: [{ id: 'f', name: 'งาน' }] })
    expect((await readVaultFile(dir)).folders[0].name).toBe('งาน')
  })

  it('save then listMeta returns meta with text, linkIds, firstImage', async () => {
    const repo = createNotesRepo(dir)
    const note = makeNote({
      id: 'A',
      title: 'บัญชี',
      content: doc(para('สวัสดี', { type: 'wikiLink', attrs: { noteId: 'B' } }), { type: 'image', attrs: { file: 'h.png' } })
    })
    const meta = await repo.save(note)
    expect(meta.updated).toBeGreaterThan(1)
    const { items, broken } = await repo.listMeta()
    expect(broken).toEqual([])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'A', title: 'บัญชี', linkIds: ['B'], firstImage: 'h.png' })
    expect(items[0].text).toContain('สวัสดี')
    expect((await repo.read('A')).content).toEqual(note.content)
  })

  it('listMeta skips corrupt json and reports it, file untouched', async () => {
    const repo = createNotesRepo(dir)
    await repo.save(makeNote({ id: 'OK' }))
    const bad = join(dir, 'notes', 'bad.json')
    writeFileSync(bad, '{"id":')
    const { items, broken } = await repo.listMeta()
    expect(broken).toEqual(['bad.json'])
    expect(items.map((m) => m.id)).toEqual(['OK'])
    expect(readFileSync(bad, 'utf8')).toBe('{"id":')
  })

  it('duplicate id repair', async () => {
    const repo = createNotesRepo(dir)
    const n = makeNote({ id: 'A', title: 'x' })
    writeFileSync(join(dir, 'notes', 'A.json'), JSON.stringify(n))
    writeFileSync(join(dir, 'notes', 'A-DESKTOP.json'), JSON.stringify(n))
    const { items } = await repo.listMeta()
    expect(items).toHaveLength(2)
    const orig = items.find((m) => m.id === 'A')!
    const copy = items.find((m) => m.id !== 'A')!
    expect(orig.title).toBe('x')
    expect(copy.title).toBe('x' + CONFLICT_SUFFIX)
    expect(copy.conflict).toBe(true)
    expect(existsSync(join(dir, 'notes', 'A-DESKTOP.json'))).toBe(false)
    expect(readdirSync(join(dir, '.trash'))).toContain('A-DESKTOP.json')
    expect(existsSync(join(dir, 'notes', `${copy.id}.json`))).toBe(true)
  })

  it('trash moves file to .trash and restore brings it back', async () => {
    const repo = createNotesRepo(dir)
    await repo.save(makeNote({ id: 'T', title: 'ทิ้ง' }))
    await repo.trash('T')
    expect((await repo.listMeta()).items).toEqual([])
    expect((await repo.listTrash()).map((m) => m.title)).toEqual(['ทิ้ง'])
    await repo.restore('T')
    expect((await repo.listMeta()).items.map((m) => m.id)).toEqual(['T'])
    expect(await repo.listTrash()).toEqual([])
  })
})
