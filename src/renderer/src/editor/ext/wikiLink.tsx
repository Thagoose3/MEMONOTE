import { Node, mergeAttributes, type Editor, type Range } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { actions, searchIndex, useApp } from '../../store/appStore'
import { popupRender, type PopupItem } from '../suggestionPopup'

export const MISSING_LABEL = 'โน้ตถูกลบ'
const UNTITLED = 'ไม่มีชื่อ'

function WikiLinkView({ node }: ReactNodeViewProps): React.JSX.Element {
  const id = node.attrs.noteId as string
  const meta = useApp((s) => s.metas[id])
  return (
    <NodeViewWrapper
      as="span"
      className={'wiki-link' + (meta ? '' : ' missing')}
      title={meta ? 'คลิกเพื่อเปิด' : 'โน้ตนี้ถูกลบหรือย้ายไปถังขยะ'}
      onClick={() => {
        if (meta) void actions.openNote(id)
      }}
    >
      {meta ? meta.title || UNTITLED : MISSING_LABEL}
    </NodeViewWrapper>
  )
}

const CREATE = '__create:'

export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { noteId: { default: null, parseHTML: (el) => el.getAttribute('data-note-id') } }
  },
  parseHTML() {
    return [{ tag: 'span[data-note-id]' }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const title = useApp.getState().metas[node.attrs.noteId as string]?.title ?? MISSING_LABEL
    return ['span', mergeAttributes({ 'data-note-id': HTMLAttributes.noteId, class: 'wiki-link' }), `[[${title}]]`]
  },
  renderText({ node }) {
    return `[[${useApp.getState().metas[node.attrs.noteId as string]?.title ?? ''}]]`
  },
  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView, { as: 'span' })
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<PopupItem>({
        editor: this.editor,
        pluginKey: new PluginKey('wikiLink'),
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        allowedPrefixes: null,
        items: ({ query }) => {
          const q = query.trim()
          const currentId = useApp.getState().openNote?.id
          const found = searchIndex
            .search(q, 9)
            .filter((r) => r.id !== currentId)
            .slice(0, 8)
            .map((r) => ({ key: r.id, label: r.title || UNTITLED }))
          const exact = found.some((f) => f.label === q)
          return q && !exact ? [...found, { key: CREATE + q, label: `สร้างโน้ตใหม่ “${q}”` }] : found
        },
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: PopupItem }) => {
          const insert = (noteId: string): void => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [{ type: 'wikiLink', attrs: { noteId } }, { type: 'text', text: ' ' }])
              .run()
          }
          if (props.key.startsWith(CREATE)) {
            const title = props.key.slice(CREATE.length)
            void actions.newNote({ title, open: false }).then((n) => insert(n.id))
          } else {
            insert(props.key)
          }
        },
        render: popupRender('ไม่พบโน้ต')
      })
    ]
  }
})
