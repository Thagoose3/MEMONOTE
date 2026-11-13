import { actions, useApp } from '../store/appStore'
import { UNTITLED } from './TopBar'

const fmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

export function Home(): React.JSX.Element {
  const vault = useApp((s) => s.vault)
  const metas = useApp((s) => s.metas)
  const recent = Object.values(metas)
    .sort((a, b) => b.updated - a.updated)
    .slice(0, 10)

  return (
    <div className="home">
      <h1 className="home-logo">MEMONOTE</h1>
      {!vault ? (
        <div className="home-menu">
          <p className="drawer-muted">เลือกโฟลเดอร์ที่จะเก็บโน้ตก่อนเริ่มใช้งาน</p>
          <button className="home-row" onClick={() => void actions.chooseVault()}>
            เปิดโฟลเดอร์เก็บโน้ต
          </button>
        </div>
      ) : (
        <div className="home-menu">
          <button className="home-row" onClick={() => void actions.newNote({ folder: null })}>
            <span>โน้ตใหม่</span>
            <kbd>Ctrl N</kbd>
          </button>
          <button className="home-row" onClick={() => actions.openSearch()}>
            <span>ค้นหา</span>
            <kbd>Ctrl P</kbd>
          </button>
          {recent.length > 0 && <div className="home-sep">ล่าสุด</div>}
          {recent.map((m) => (
            <button key={m.id} className="home-row" onClick={() => void actions.openNote(m.id)}>
              <span>{m.title || UNTITLED}</span>
              <span className="home-date">{fmt.format(m.updated)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
