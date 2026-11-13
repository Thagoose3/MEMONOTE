import type { NoteMeta } from '@shared/types'

/** target id -> ids of notes linking to it (in input order, self links ignored). */
export function computeBacklinks(metas: NoteMeta[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const m of metas) {
    for (const target of m.linkIds) {
      if (target === m.id) continue
      const list = out.get(target) ?? []
      if (!list.includes(m.id)) list.push(m.id)
      out.set(target, list)
    }
  }
  return out
}
