import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { VaultFile } from '@shared/types'
import { readJson, writeFileAtomic } from './fsAtomic'

export async function initVault(dir: string): Promise<void> {
  for (const d of ['notes', 'boards', 'assets', join('assets', '.thumbs'), '.trash']) {
    await fs.mkdir(join(dir, d), { recursive: true })
  }
  try {
    await fs.access(join(dir, 'vault.json'))
  } catch {
    await writeVaultFile(dir, { version: 1, folders: [] })
  }
}

export async function readVaultFile(dir: string): Promise<VaultFile> {
  try {
    const v = await readJson<VaultFile>(join(dir, 'vault.json'))
    return { version: 1, folders: Array.isArray(v.folders) ? v.folders : [] }
  } catch {
    return { version: 1, folders: [] }
  }
}

export async function writeVaultFile(dir: string, v: VaultFile): Promise<void> {
  await writeFileAtomic(join(dir, 'vault.json'), JSON.stringify(v, null, 2))
}
