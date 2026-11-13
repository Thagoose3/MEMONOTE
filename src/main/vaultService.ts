import type { ExternalChange } from '@shared/types'
import { createAssets, type Assets } from './vault/assets'
import { createBoardsRepo, type BoardsRepo } from './vault/boardsRepo'
import { nativeImageOps } from './vault/imageOps'
import { createNotesRepo, type NotesRepo } from './vault/notesRepo'
import { initVault } from './vault/vaultFile'
import { createSelfWriteFilter, watchVault } from './vault/watcher'

export interface OpenVault {
  dir: string
  notes: NotesRepo
  boards: BoardsRepo
  assets: Assets
  close(): Promise<void>
}

/** Opens (initialising if needed) the vault at `dir` and starts watching it. */
export async function openVault(dir: string, emit: (e: ExternalChange) => void): Promise<OpenVault> {
  await initVault(dir)
  const filter = createSelfWriteFilter()
  const mark = (p: string): void => filter.mark(p)
  const stop = await watchVault(dir, filter, emit)
  return {
    dir,
    notes: createNotesRepo(dir, mark),
    boards: createBoardsRepo(dir, mark),
    assets: createAssets(dir, nativeImageOps, mark),
    close: stop
  }
}
