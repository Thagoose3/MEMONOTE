import MiniSearch from 'minisearch'
import type { NoteMeta } from '@shared/types'

const segmenter = new Intl.Segmenter('th', { granularity: 'word' })

/** Word tokens for Thai (no spaces between words) and everything else; lowercased. */
export function tokenizeThai(text: string): string[] {
  const out: string[] = []
  for (const s of segmenter.segment(text)) {
    if (s.isWordLike) out.push(s.segment.toLowerCase())
  }
  return out
}

export interface SearchResult {
  id: string
  title: string
  snippet: string
}

function makeSnippet(text: string, terms: string[]): string {
  const lines = text.split('\n')
  const lower = terms.map((t) => t.toLowerCase())
  const line = lines.find((l) => lower.some((t) => l.toLowerCase().includes(t))) ?? lines[0] ?? ''
  if (line.length <= 90) return line
  const at = Math.max(0, line.toLowerCase().indexOf(lower[0] ?? '') - 30)
  return (at > 0 ? '…' : '') + line.slice(at, at + 90) + '…'
}

export function createSearchIndex() {
  const metas = new Map<string, NoteMeta>()
  const make = (): MiniSearch<NoteMeta> =>
    new MiniSearch<NoteMeta>({
      fields: ['title', 'text'],
      storeFields: [],
      tokenize: tokenizeThai,
      processTerm: (t) => t,
      searchOptions: { boost: { title: 3 }, prefix: true, fuzzy: 0.15, combineWith: 'AND' }
    })
  let ms = make()

  return {
    setAll(all: NoteMeta[]): void {
      ms = make()
      metas.clear()
      for (const m of all) metas.set(m.id, m)
      ms.addAll(all)
    },
    upsert(m: NoteMeta): void {
      if (metas.has(m.id)) ms.discard(m.id)
      metas.set(m.id, m)
      ms.add(m)
    },
    remove(id: string): void {
      if (!metas.has(id)) return
      ms.discard(id)
      metas.delete(id)
    },
    search(q: string, limit = 20): SearchResult[] {
      const query = q.trim()
      if (!query) {
        return [...metas.values()]
          .sort((a, b) => b.updated - a.updated)
          .slice(0, limit)
          .map((m) => ({ id: m.id, title: m.title, snippet: makeSnippet(m.text, []) }))
      }
      const terms = tokenizeThai(query)
      return ms
        .search(query)
        .slice(0, limit)
        .map((r) => {
          const m = metas.get(String(r.id))!
          return { id: m.id, title: m.title, snippet: makeSnippet(m.text, terms) }
        })
    }
  }
}

export type SearchIndex = ReturnType<typeof createSearchIndex>
