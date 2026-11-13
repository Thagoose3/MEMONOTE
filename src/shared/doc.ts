import type { DocNode, Note, NoteMeta } from './types'

export function noteToMeta(n: Note): NoteMeta {
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

const BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'codeBlock', 'blockquote', 'listItem', 'tableCell', 'tableHeader', 'copyField', 'image'
])

function walk(node: DocNode, visit: (n: DocNode) => void): void {
  visit(node)
  node.content?.forEach((c) => walk(c, visit))
}

/** Plain text of a document: one line per block; includes code and copy-field label/value. */
export function extractPlainText(doc: DocNode): string {
  const lines: string[] = []
  const collect = (n: DocNode): string => {
    if (n.type === 'text') return n.text ?? ''
    if (n.type === 'hardBreak') return ' '
    if (n.type === 'copyField') return `${n.attrs?.label ?? ''} ${n.attrs?.value ?? ''}`.trim()
    if (n.type === 'wikiLink') return ''
    return (n.content ?? []).map(collect).join('')
  }
  const visitBlock = (n: DocNode): void => {
    if (BLOCK_TYPES.has(n.type) && n.type !== 'listItem' && n.type !== 'tableCell' && n.type !== 'tableHeader') {
      const line = collect(n)
      if (line) lines.push(line)
      return
    }
    n.content?.forEach(visitBlock)
  }
  visitBlock(doc)
  return lines.join('\n')
}

export function extractLinkIds(doc: DocNode): string[] {
  const ids: string[] = []
  walk(doc, (n) => {
    const id = n.type === 'wikiLink' ? n.attrs?.noteId : undefined
    if (typeof id === 'string' && !ids.includes(id)) ids.push(id)
  })
  return ids
}

export function firstImage(doc: DocNode): string | null {
  let found: string | null = null
  walk(doc, (n) => {
    if (!found && n.type === 'image' && typeof n.attrs?.file === 'string') found = n.attrs.file
  })
  return found
}
