import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { ulid } from 'ulid'
import { CONFLICT_SUFFIX, type ListResult, type Note, type NoteMeta } from '@shared/types'
import { extractLinkIds, extractPlainText, firstImage } from '@shared/doc'
import { readJson, writeFileAtomic } from './fsAtomic'

export type WriteHook = (path: string) => void

export function toMeta(n: Note): NoteMeta {
  return {
    id: n.id,
    title: n.title,
    folder: n.folder,
    created: n.created,
    updated: n.updated,
    text: extractPlainText(n.content),
    linkIds: extractLinkIds(n.content),
    firstImage: firstImage(n.content),
    ...(n.conflict ? { conflict: true } : {})
  }
}

function isNote(x: unknown): x is Note {
  const n = x as Note
  return !!n && typeof n.id === 'string' && typeof n.title === 'string' && !!n.content && typeof n.content === 'object'
}

/** Moves `src` into `.trash`, picking a free name if one is taken. */
async function moveToTrash(vaultDir: string, src: string, name: string): Promise<void> {
  let target = join(vaultDir, '.trash', name)
  try {
    await fs.access(target)
    target = join(vaultDir, '.trash', `${Date.now()}-${name}`)
  } catch {
    /* free */
  }
  await fs.rename(src, target)
}

async function readDirJson<T>(dir: string, guard: (x: unknown) => x is T): Promise<{ file: string; value: T }[] & { broken?: string[] }> {
  const files = (await fs.readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith('.json'))
  const out: { file: string; value: T }[] & { broken?: string[] } = []
  out.broken = []
  for (let i = 0; i < files.length; i += 64) {
    const batch = files.slice(i, i + 64)
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const value = await readJson<unknown>(join(dir, file))
          return guard(value) ? { file, value } : { file, value: null }
        } catch {
          return { file, value: null }
        }
      })
    )
    for (const r of results) {
      if (r.value === null) out.broken!.push(r.file)
      else out.push({ file: r.file, value: r.value as T })
    }
  }
  return out
}

export function createNotesRepo(vaultDir: string, onWrite: WriteHook = () => {}) {
  const notesDir = join(vaultDir, 'notes')
  const pathOf = (id: string): string => join(notesDir, `${id}.json`)

  async function write(n: Note): Promise<void> {
    const p = pathOf(n.id)
    onWrite(p)
    await writeFileAtomic(p, JSON.stringify(n))
  }

  return {
    async listMeta(): Promise<ListResult<NoteMeta>> {
      const entries = await readDirJson(notesDir, isNote)
      // Files named exactly `<id>.json` win; others claiming a taken id are conflict copies.
      entries.sort((a, b) => Number(b.file === `${b.value.id}.json`) - Number(a.file === `${a.value.id}.json`))
      const seen = new Set<string>()
      const items: NoteMeta[] = []
      for (const { file, value } of entries) {
        if (!seen.has(value.id) && file === `${value.id}.json`) {
          seen.add(value.id)
          items.push(toMeta(value))
          continue
        }
        if (!seen.has(value.id)) {
          // misnamed but unique: keep its id, normalise the file name
          seen.add(value.id)
          await write(value)
          await moveToTrash(vaultDir, join(notesDir, file), file)
          items.push(toMeta(value))
          continue
        }
        const copy: Note = { ...value, id: ulid(), title: value.title + CONFLICT_SUFFIX, conflict: true }
        await write(copy)
        await moveToTrash(vaultDir, join(notesDir, file), file)
        seen.add(copy.id)
        items.push(toMeta(copy))
      }
      return { items, broken: entries.broken ?? [] }
    },

    async read(id: string): Promise<Note> {
      return readJson<Note>(pathOf(id))
    },

    async save(n: Note): Promise<NoteMeta> {
      const saved: Note = { ...n, updated: Date.now() }
      await write(saved)
      return toMeta(saved)
    },

    async trash(id: string): Promise<void> {
      onWrite(pathOf(id))
      await moveToTrash(vaultDir, pathOf(id), `${id}.json`)
    },

    async restore(id: string): Promise<void> {
      const src = join(vaultDir, '.trash', `${id}.json`)
      const n = await readJson<Note>(src)
      await write(n)
      await fs.rm(src)
    },

    async listTrash(): Promise<NoteMeta[]> {
      const entries = await readDirJson(join(vaultDir, '.trash'), isNote)
      return entries.filter((e) => e.file === `${e.value.id}.json`).map((e) => toMeta(e.value))
    }
  }
}

export type NotesRepo = ReturnType<typeof createNotesRepo>
export { readDirJson, moveToTrash }
