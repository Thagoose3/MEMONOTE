import { actions, useApp } from '../store/appStore'

export function Backlinks(props: { noteId: string }): React.JSX.Element | null {
  const ids = useApp((s) => s.backlinks.get(props.noteId))
  const metas = useApp((s) => s.metas)
  const list = (ids ?? []).filter((id) => metas[id])
  if (!list.length) return null
  return (
    <section className="backlinks" aria-label="ลิงก์มาจาก">
      <span className="backlinks-label">ลิงก์มาจาก:</span>
      {list.map((id) => (
        <button key={id} className="backlink" onClick={() => void actions.openNote(id)}>
          {metas[id].title || 'ไม่มีชื่อ'}
        </button>
      ))}
    </section>
  )
}
