import type { DocNode, Note } from '@shared/types'
import { extractPlainText } from '@shared/doc'

/** Placeholder body editor (plain paragraphs). Replaced by the rich editor in Task 8. */
export function NoteEditor(props: { note: Note; onChange: (content: DocNode) => void }): React.JSX.Element {
  return (
    <textarea
      className="plain-editor"
      aria-label="เนื้อหา"
      defaultValue={extractPlainText(props.note.content)}
      onChange={(e) =>
        props.onChange({
          type: 'doc',
          content: e.target.value.split('\n').map((line) => ({
            type: 'paragraph',
            ...(line ? { content: [{ type: 'text', text: line }] } : {})
          }))
        })
      }
    />
  )
}
