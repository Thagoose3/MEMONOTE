import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import type { EditorView } from '@tiptap/pm/view'
import { TextSelection } from '@tiptap/pm/state'
import { ulid } from 'ulid'
import { useRef } from 'react'
import { storage } from '../../storage'
import { actions, showToast, useApp } from '../../store/appStore'
import { trackUpload } from '../uploads'

export const assetUrl = (file: string): string => `memo-asset://a/${encodeURIComponent(file)}`
export const thumbUrl = (file: string): string => `memo-asset://t/${encodeURIComponent(file)}`

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

function ImageView({ node, updateAttributes, selected }: ReactNodeViewProps): React.JSX.Element {
  const file = node.attrs.file as string | null
  const width = node.attrs.width as number | null
  const imgRef = useRef<HTMLImageElement>(null)

  const startResize = (e: React.PointerEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = imgRef.current?.getBoundingClientRect().width ?? 300
    const move = (ev: PointerEvent): void => {
      const w = Math.max(60, Math.round(startW + ev.clientX - startX))
      if (imgRef.current) imgRef.current.style.width = `${w}px`
    }
    const up = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      updateAttributes({ width: Math.max(60, Math.round(startW + ev.clientX - startX)) })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <NodeViewWrapper className={'image-node' + (selected ? ' selected' : '')} data-drag-handle>
      {file ? (
        <span className="image-frame">
          <img ref={imgRef} src={assetUrl(file)} style={width ? { width } : undefined} draggable={false} alt="" />
          <span className="image-resize" onPointerDown={startResize} title="ลากเพื่อปรับขนาด" />
        </span>
      ) : (
        <span className="image-pending">กำลังบันทึกรูป…</span>
      )}
    </NodeViewWrapper>
  )
}

export const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      file: { default: null, parseHTML: (el) => el.getAttribute('data-file') },
      width: {
        default: null,
        parseHTML: (el) => (el.getAttribute('data-width') ? Number(el.getAttribute('data-width')) : null)
      },
      uploadId: { default: null, rendered: false }
    }
  },
  parseHTML() {
    return [{ tag: 'img[data-file]' }]
  },
  renderHTML({ HTMLAttributes }) {
    const { file, width } = HTMLAttributes
    return ['img', mergeAttributes({ 'data-file': file, 'data-width': width, src: file ? assetUrl(file) : '' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  }
})

export function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => IMAGE_MIMES.includes(f.type))
}

/** Insert placeholders immediately, then save each image in the background and fill in its file. */
export function insertImages(view: EditorView, files: File[], pos?: number): void {
  const { schema } = view.state
  const ids = files.map(() => ulid())
  let tr = view.state.tr
  const at = pos ?? tr.selection.to
  const nodes = ids.map((uploadId) => schema.nodes.image.create({ uploadId }))
  if (pos === undefined) tr = tr.replaceSelectionWith(nodes[0])
  else tr = tr.insert(at, nodes[0])
  let insertAt = tr.mapping.map(at)
  for (const n of nodes.slice(1)) {
    tr = tr.insert(insertAt, n)
    insertAt += n.nodeSize
  }
  // Put the cursor in a text block after the images so typing never replaces a selected image.
  const after = tr.selection.to > insertAt ? tr.selection.to : insertAt
  const $after = tr.doc.resolve(Math.min(after, tr.doc.content.size))
  if (!$after.nodeAfter || !$after.nodeAfter.isTextblock) {
    tr = tr.insert($after.pos, schema.nodes.paragraph.create())
  }
  tr = tr.setSelection(TextSelection.near(tr.doc.resolve($after.pos + 1)))
  view.dispatch(tr.scrollIntoView())

  const noteId = useApp.getState().openNote?.id ?? null
  files.forEach((file, i) => {
    const uploadId = ids[i]
    trackUpload(
      uploadId,
      (async () => {
        let ref: { file: string } | null = null
        try {
          ref = await storage.assets.saveImage(new Uint8Array(await file.arrayBuffer()), file.type)
        } catch {
          showToast('บันทึกรูปไม่ได้')
        }
        // Editor still showing the placeholder: fill it in place.
        if (!view.isDestroyed) {
          const st = view.state
          let found = false
          st.doc.descendants((node, p) => {
            if (found) return false
            if (node.type.name === 'image' && node.attrs.uploadId === uploadId) {
              found = true
              view.dispatch(
                ref
                  ? st.tr.setNodeMarkup(p, undefined, { ...node.attrs, file: ref.file, uploadId: null })
                  : st.tr.delete(p, p + node.nodeSize)
              )
            }
            return !found
          })
          if (found) return
        }
        // Editor is gone (switched note / closing): patch the saved note instead.
        if (noteId) await actions.resolveUpload(noteId, uploadId, ref?.file ?? null)
      })()
    )
  })
}
