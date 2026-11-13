import { join } from 'node:path'
import type { Board, BoardMeta, ListResult } from '@shared/types'
import { readJson, writeFileAtomic } from './fsAtomic'
import { moveToTrash, readDirJson, type WriteHook } from './notesRepo'

function isBoard(x: unknown): x is Board {
  const b = x as Board
  return !!b && typeof b.id === 'string' && Array.isArray(b.nodes) && Array.isArray(b.edges)
}

export function createBoardsRepo(vaultDir: string, onWrite: WriteHook = () => {}) {
  const dir = join(vaultDir, 'boards')
  const pathOf = (id: string): string => join(dir, `${id}.json`)
  return {
    async list(): Promise<ListResult<BoardMeta>> {
      const entries = await readDirJson(dir, isBoard)
      return {
        items: entries.map(({ value: b }) => ({ id: b.id, title: b.title, updated: b.updated })),
        broken: entries.broken ?? []
      }
    },
    async read(id: string): Promise<Board> {
      return readJson<Board>(pathOf(id))
    },
    async save(b: Board): Promise<void> {
      const p = pathOf(b.id)
      onWrite(p)
      await writeFileAtomic(p, JSON.stringify({ ...b, updated: Date.now() }))
    },
    async trash(id: string): Promise<void> {
      onWrite(pathOf(id))
      await moveToTrash(vaultDir, pathOf(id), `${id}.json`)
    }
  }
}

export type BoardsRepo = ReturnType<typeof createBoardsRepo>
