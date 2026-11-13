import { watch } from 'chokidar'
import { basename, dirname, resolve } from 'node:path'
import type { ExternalChange } from '@shared/types'

const norm = (p: string): string => resolve(p).toLowerCase()

export interface SelfWriteFilter {
  mark(path: string): void
  isSelf(path: string): boolean
}

/** Remembers paths this process just wrote so the watcher can ignore its own writes. */
export function createSelfWriteFilter(windowMs = 1500): SelfWriteFilter {
  const marks = new Map<string, number>()
  return {
    mark(path) {
      marks.set(norm(path), Date.now())
    },
    isSelf(path) {
      const t = marks.get(norm(path))
      if (t === undefined) return false
      if (Date.now() - t > windowMs) {
        marks.delete(norm(path))
        return false
      }
      return true
    }
  }
}

export async function watchVault(
  dir: string,
  filter: SelfWriteFilter,
  emit: (e: ExternalChange) => void
): Promise<() => Promise<void>> {
  const watcher = watch([resolve(dir, 'notes'), resolve(dir, 'boards')], {
    ignoreInitial: true,
    depth: 0,
    ignored: (p: string) => p.endsWith('.tmp'),
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })
  const handle = (change: ExternalChange['change']) => (p: string) => {
    if (!p.endsWith('.json') || filter.isSelf(p)) return
    const kind = basename(dirname(p)).toLowerCase() === 'boards' ? 'board' : 'note'
    emit({ kind, id: basename(p, '.json'), change })
  }
  watcher.on('add', handle('changed')).on('change', handle('changed')).on('unlink', handle('removed'))
  await new Promise<void>((r) => watcher.once('ready', () => r()))
  return () => watcher.close()
}
