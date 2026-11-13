import type { DocNode } from '@shared/types'

const isPlaceholder = (n: DocNode): boolean => n.type === 'image' && !n.attrs?.file && typeof n.attrs?.uploadId === 'string'

/** Map over a document, dropping nodes for which `fn` returns null. Returns the same object if nothing changed. */
function mapDoc(node: DocNode, fn: (n: DocNode) => DocNode | null): DocNode {
  if (!node.content) return node
  let changed = false
  const content: DocNode[] = []
  for (const child of node.content) {
    const mapped = fn(child)
    if (mapped === null) {
      changed = true
      continue
    }
    const deep = mapDoc(mapped, fn)
    if (deep !== child) changed = true
    content.push(deep)
  }
  return changed ? { ...node, content } : node
}

/** Fill a finished upload into its placeholder (or remove the placeholder if the upload failed). */
export function fillUpload(doc: DocNode, uploadId: string, file: string | null): DocNode {
  return mapDoc(doc, (n) => {
    if (!isPlaceholder(n) || n.attrs!.uploadId !== uploadId) return n
    return file ? { ...n, attrs: { ...n.attrs, file, uploadId: null } } : null
  })
}

/** Remove placeholders whose upload is not running anymore (e.g. app was killed mid-upload). */
export function stripOrphanPlaceholders(doc: DocNode, pending: ReadonlySet<string>): DocNode {
  return mapDoc(doc, (n) => (isPlaceholder(n) && !pending.has(n.attrs!.uploadId as string) ? null : n))
}
