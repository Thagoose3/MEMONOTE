import { useEditor, EditorContent, type Extensions } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import type { DocNode, Note } from '@shared/types'
import { CodeBlock } from './ext/codeBlock'
import { ImageNode, imageFiles, insertImages } from './ext/imageNode'
import { editorExtras } from './extras'

export function NoteEditor(props: { note: Note; onChange: (content: DocNode) => void }): React.JSX.Element {
  const extensions: Extensions = [
    StarterKit.configure({ codeBlock: false, link: { openOnClick: false, autolink: true } }),
    CodeBlock,
    ImageNode,
    TableKit.configure({ table: { resizable: false } }),
    ...editorExtras()
  ]
  const editor = useEditor({
    extensions,
    content: props.note.content,
    autofocus: false,
    editorProps: {
      attributes: { 'aria-label': 'เนื้อหา', class: 'prose', spellcheck: 'false' },
      handlePaste(view, event) {
        const files = imageFiles(event.clipboardData?.files)
        const hasText = !!event.clipboardData?.getData('text/plain')
        if (files.length && !hasText) {
          event.preventDefault()
          insertImages(view, files)
          return true
        }
        return false
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = imageFiles(event.dataTransfer?.files)
        if (!files.length) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        insertImages(view, files, pos)
        return true
      }
    },
    onUpdate({ editor }) {
      props.onChange(editor.getJSON() as DocNode)
    }
  })

  return <EditorContent editor={editor} className="editor-root" />
}
