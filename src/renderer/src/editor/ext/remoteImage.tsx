import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { useState } from 'react'
import { storage } from '../../storage'
import { rewriteRemoteImages } from './pasteHtml'
import { insertImages } from './imageNode'

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function RemoteImageView({ node, editor, getPos }: ReactNodeViewProps): React.JSX.Element {
  const url = node.attrs.url as string
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const download = async (): Promise<void> => {
    setState('loading')
    try {
      const ref = await storage.assets.downloadImage(url)
      const pos = typeof getPos === 'function' ? getPos() : undefined
      if (pos === undefined) return
      editor
        .chain()
        .insertContentAt({ from: pos, to: pos + node.nodeSize }, { type: 'image', attrs: { file: ref.file } })
        .run()
    } catch {
      setState('error')
    }
  }
  return (
    <NodeViewWrapper as="span" className="remote-image">
      <button
        className="remote-image-btn"
        contentEditable={false}
        disabled={state === 'loading'}
        onClick={() => void download()}
        title={url}
      >
        {state === 'loading'
          ? 'กำลังดาวน์โหลด…'
          : state === 'error'
            ? `ดาวน์โหลดไม่ได้ (${hostOf(url)}) — กดเพื่อลองใหม่`
            : `🖼 รูปจากเว็บ — กดเพื่อดาวน์โหลด (${hostOf(url)})`}
      </button>
    </NodeViewWrapper>
  )
}

export const RemoteImage = Node.create({
  name: 'remoteImage',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { url: { default: '', parseHTML: (el) => el.getAttribute('data-remote-image') ?? '' } }
  },
  parseHTML() {
    return [{ tag: 'span[data-remote-image]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-remote-image': HTMLAttributes.url })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(RemoteImageView, { as: 'span' })
  }
})

function dataUrlToFile(src: string, i: number): File | null {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.*)$/i.exec(src)
  if (!m) return null
  try {
    const bin = atob(m[2])
    const bytes = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
    return new File([bytes], `pasted-${i}`, { type: m[1].toLowerCase() })
  } catch {
    return null
  }
}

/** Rewrites remote <img> in pasted HTML; data: images become saved images after the pasted content. */
export const PasteHtmlImages = Extension.create({
  name: 'pasteHtmlImages',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pasteHtmlImages'),
        props: {
          transformPastedHTML: (html) => rewriteRemoteImages(html),
          handlePaste: (view, event) => {
            const html = event.clipboardData?.getData('text/html')
            if (!html || !/src\s*=\s*["']data:image\//i.test(html)) return false
            const files = [...html.matchAll(/src\s*=\s*["'](data:image\/[^"']+)["']/gi)]
              .map((m, i) => dataUrlToFile(m[1], i))
              .filter((f): f is File => !!f)
            if (files.length) setTimeout(() => !view.isDestroyed && insertImages(view, files), 0)
            return false
          }
        }
      })
    ]
  }
})
