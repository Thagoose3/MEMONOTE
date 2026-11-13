import { useEffect, useRef, useState } from 'react'
import { actions, folderName, useApp } from '../store/appStore'
import { useBoardTitle } from './boardTitle'

export const UNTITLED = 'ไม่มีชื่อ'

function InlineRename(props: { value: string; label: string; onDone: (v: string | null) => void }): React.JSX.Element {
  const [v, setV] = useState(props.value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.select(), [])
  return (
    <input
      ref={ref}
      className="crumb-input"
      aria-label={props.label}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => props.onDone(v.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') props.onDone(v.trim())
        if (e.key === 'Escape') props.onDone(null)
      }}
    />
  )
}

function Breadcrumb(): React.JSX.Element | null {
  const mode = useApp((s) => s.mode)
  const note = useApp((s) => s.openNote)
  useApp((s) => s.folders)
  const board = useBoardTitle()
  const [editing, setEditing] = useState(false)

  if (mode === 'board') {
    if (!board) return <nav className="crumbs" aria-label="ตำแหน่ง" />
    return (
      <nav className="crumbs" aria-label="ตำแหน่ง">
        <span className="crumb-muted">กระดาน</span>
        <span className="crumb-sep">/</span>
        {editing ? (
          <InlineRename
            value={board.title}
            label="ชื่อกระดานใหม่"
            onDone={(v) => {
              setEditing(false)
              if (v !== null) board.rename(v)
            }}
          />
        ) : (
          <button className="crumb" aria-label="เปลี่ยนชื่อกระดาน" onClick={() => setEditing(true)}>
            {board.title || UNTITLED}
          </button>
        )}
      </nav>
    )
  }

  if (!note) return <nav className="crumbs" aria-label="ตำแหน่ง" />
  const folder = folderName(note.folder)
  return (
    <nav className="crumbs" aria-label="ตำแหน่ง">
      {folder && (
        <>
          <span className="crumb-muted">{folder}</span>
          <span className="crumb-sep">/</span>
        </>
      )}
      {editing ? (
        <InlineRename
          value={note.title}
          label="ชื่อโน้ตใหม่"
          onDone={(v) => {
            setEditing(false)
            if (v !== null) actions.editOpenNote({ title: v })
          }}
        />
      ) : (
        <button className="crumb" aria-label="เปลี่ยนชื่อโน้ต" onClick={() => setEditing(true)}>
          {note.title || UNTITLED}
        </button>
      )}
    </nav>
  )
}

export function TopBar(): React.JSX.Element {
  const mode = useApp((s) => s.mode)
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" aria-label="เมนู" title="เมนู" onClick={() => actions.setDrawer(!useApp.getState().drawerOpen)}>
          ☰
        </button>
        <Breadcrumb />
      </div>
      <div className="mode-switch" role="group" aria-label="โหมด">
        <button className={mode === 'note' ? 'active' : ''} aria-pressed={mode === 'note'} onClick={() => actions.setMode('note')}>
          โน้ต
        </button>
        <button className={mode === 'board' ? 'active' : ''} aria-pressed={mode === 'board'} onClick={() => actions.setMode('board')}>
          กระดาน
        </button>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="ค้นหา" title="ค้นหา (Ctrl+P)" onClick={() => actions.openSearch()}>
          🔍
        </button>
      </div>
    </header>
  )
}
