import { useEffect, useRef } from 'react'
import { actions, useApp } from '../store/appStore'
import { NoteEditor } from '../editor/NoteEditor'
import { Backlinks } from '../editor/Backlinks'

export function NotePage(): React.JSX.Element | null {
  const note = useApp((s) => s.openNote)
  const version = useApp((s) => s.noteVersion)
  const focusTitle = useApp((s) => s.focusTitle)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus()
  }, [focusTitle])

  if (!note) return null
  return (
    <div className="note-page">
      <input
        ref={titleRef}
        className="note-title"
        aria-label="ชื่อโน้ต"
        placeholder="ชื่อโน้ต"
        value={note.title}
        onChange={(e) => actions.editOpenNote({ title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault()
            document.querySelector<HTMLElement>('[aria-label="เนื้อหา"]')?.focus()
          }
        }}
      />
      <NoteEditor key={`${note.id}:${version}`} note={note} onChange={(content) => actions.editOpenNote({ content })} />
      <Backlinks noteId={note.id} />
    </div>
  )
}
