import { describe, it, expect, beforeEach } from 'vitest'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBoardsRepo } from '../../src/main/vault/boardsRepo'
import { initVault } from '../../src/main/vault/vaultFile'
import type { Board } from '@shared/types'
import { tempDir } from './helpers'

const board: Board = {
  id: 'B1',
  title: 'เว็บร้าน',
  created: 1,
  updated: 1,
  nodes: [
    { id: 'n1', x: 0, y: 0, kind: 'note', noteId: 'A' },
    { id: 's1', x: 10, y: 20, kind: 'stroke', points: [[0, 0, 0.5], [5, 5, 0.7]], color: '#1f1f1f', size: 'M' }
  ],
  edges: [{ id: 'e1', from: 'n1', to: 's1', label: 'ใช้', color: 'blue' }]
}

let dir: string
beforeEach(async () => {
  dir = tempDir('boards')
  await initVault(dir)
})

describe('boardsRepo', () => {
  it('save/read roundtrip keeps stroke points and edges', async () => {
    const repo = createBoardsRepo(dir)
    await repo.save(board)
    const back = await repo.read('B1')
    expect(back.nodes).toEqual(board.nodes)
    expect(back.edges).toEqual(board.edges)
    expect(back.updated).toBeGreaterThan(1)
    expect((await repo.list()).items).toMatchObject([{ id: 'B1', title: 'เว็บร้าน' }])
  })

  it('list reports corrupt board files in broken', async () => {
    const repo = createBoardsRepo(dir)
    writeFileSync(join(dir, 'boards', 'bad.json'), '{')
    expect(await repo.list()).toEqual({ items: [], broken: ['bad.json'] })
  })

  it('trash moves board to .trash', async () => {
    const repo = createBoardsRepo(dir)
    await repo.save(board)
    await repo.trash('B1')
    expect((await repo.list()).items).toEqual([])
    expect(readdirSync(join(dir, '.trash'))).toContain('B1.json')
  })
})
