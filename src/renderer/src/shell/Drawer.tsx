import { useEffect, useMemo, useState } from 'react'
import type { NoteMeta } from '@shared/types'
import { storage } from '../storage'
import { actions, useApp } from '../store/appStore'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { UNTITLED } from './TopBar'
import { BoardList } from './drawerBoards'

type Panel = 'list' | 'trash' | 'settings'

function NameInput(props: { placeholder: string; initial?: string; onDone: (v: string | null) => void }): React.JSX.Element {
  const [v, setV] = useState(props.initial ?? '')
  return (
    <input
      autoFocus
      className="drawer-input"
      placeholder={props.placeholder}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => props.onDone(v.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') props.onDone(v.trim() || null)
        if (e.key === 'Escape') props.onDone(null)
      }}
    />
  )
}

function NoteItem(props: { m: NoteMeta; onMenu: (e: React.MouseEvent, m: NoteMeta) => void; renaming: boolean; onRenamed: () => void }): React.JSX.Element {
  const openId = useApp((s) => s.openNote?.id)
  if (props.renaming) {
    return (
      <NameInput
        placeholder="ชื่อโน้ต"
        initial={props.m.title}
        onDone={(v) => {
          props.onRenamed()
          if (v) void actions.updateNote(props.m.id, { title: v })
        }}
      />
    )
  }
  return (
    <button
      className={'drawer-item' + (openId === props.m.id ? ' current' : '')}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-memonote-note', props.m.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => void actions.openNote(props.m.id)}
      onContextMenu={(e) => props.onMenu(e, props.m)}
    >
      {props.m.title || UNTITLED}
    </button>
  )
}

function TrashPanel(): React.JSX.Element {
  const [items, setItems] = useState<NoteMeta[] | null>(null)
  const load = (): void => void storage.notes.listTrash().then(setItems)
  useEffect(load, [])
  if (!items) return <p className="drawer-muted">กำลังโหลด…</p>
  if (!items.length) return <p className="drawer-muted">ถังขยะว่าง</p>
  return (
    <div>
      {items.map((m) => (
        <div key={m.id} className="trash-row">
          <span>{m.title || UNTITLED}</span>
          <button
            className="small-btn"
            aria-label={`กู้คืน ${m.title || UNTITLED}`}
            onClick={async () => {
              await actions.restoreNote(m.id)
              load()
            }}
          >
            กู้คืน
          </button>
        </div>
      ))}
    </div>
  )
}

function SettingsPanel(): React.JSX.Element {
  const vault = useApp((s) => s.vault)
  return (
    <div className="settings">
      <div className="drawer-muted">โฟลเดอร์เก็บโน้ต</div>
      <div className="vault-path">{vault ?? '-'}</div>
      <button className="small-btn" onClick={() => void actions.chooseVault()}>
        เปลี่ยนโฟลเดอร์
      </button>
    </div>
  )
}

export function Drawer(): React.JSX.Element | null {
  const open = useApp((s) => s.drawerOpen)
  const mode = useApp((s) => s.mode)
  const metas = useApp((s) => s.metas)
  const folders = useApp((s) => s.folders)
  const [panel, setPanel] = useState<Panel>('list')
  const [addingFolder, setAddingFolder] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)

  useEffect(() => {
    if (!open) {
      setPanel('list')
      setMenu(null)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') actions.setDrawer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const byFolder = useMemo(() => {
    const sorted = Object.values(metas).sort((a, b) => (a.title || UNTITLED).localeCompare(b.title || UNTITLED, 'th'))
    const map = new Map<string | null, NoteMeta[]>()
    for (const m of sorted) {
      const key = m.folder && folders.some((f) => f.id === m.folder) ? m.folder : null
      map.set(key, [...(map.get(key) ?? []), m])
    }
    return map
  }, [metas, folders])

  if (!open) return null

  const noteMenu = (e: React.MouseEvent, m: NoteMeta): void => {
    e.preventDefault()
    const items: MenuItem[] = [{ label: 'เปลี่ยนชื่อ', onSelect: () => setRenaming(m.id) }]
    for (const f of folders) {
      if (f.id !== m.folder) items.push({ label: `ย้ายไป ${f.name}`, onSelect: () => void actions.updateNote(m.id, { folder: f.id }) })
    }
    if (m.folder) items.push({ label: 'ย้ายออกจากโฟลเดอร์', onSelect: () => void actions.updateNote(m.id, { folder: null }) })
    items.push({ label: 'ลบ', danger: true, onSelect: () => void actions.trashNote(m.id) })
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  const folderMenu = (e: React.MouseEvent, id: string): void => {
    e.preventDefault()
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'เปลี่ยนชื่อโฟลเดอร์', onSelect: () => setRenamingFolder(id) },
        { label: 'ลบโฟลเดอร์ (โน้ตย้ายออกมา)', danger: true, onSelect: () => void actions.deleteFolder(id) }
      ]
    })
  }

  const notes = (list: NoteMeta[] | undefined): React.ReactNode =>
    (list ?? []).map((m) => (
      <NoteItem key={m.id} m={m} onMenu={noteMenu} renaming={renaming === m.id} onRenamed={() => setRenaming(null)} />
    ))

  return (
    <>
      <div className="drawer-backdrop" onMouseDown={() => actions.setDrawer(false)} />
      <aside className="drawer" aria-label="รายการ">
        {panel === 'list' && mode === 'board' && <BoardList />}
        {panel === 'list' && mode === 'note' && (
          <>
            <div className="drawer-actions">
              <button className="drawer-primary" onClick={() => void actions.newNote({ folder: null })}>
                ＋ โน้ตใหม่
              </button>
              <button className="small-btn" onClick={() => setAddingFolder(true)}>
                โฟลเดอร์ใหม่
              </button>
            </div>
            {addingFolder && (
              <NameInput
                placeholder="ชื่อโฟลเดอร์"
                onDone={(v) => {
                  setAddingFolder(false)
                  if (v) void actions.addFolder(v)
                }}
              />
            )}
            <div className="drawer-scroll">
              {folders.map((f) => (
                <section key={f.id} className="drawer-folder">
                  {renamingFolder === f.id ? (
                    <NameInput
                      placeholder="ชื่อโฟลเดอร์"
                      initial={f.name}
                      onDone={(v) => {
                        setRenamingFolder(null)
                        if (v) void actions.renameFolder(f.id, v)
                      }}
                    />
                  ) : (
                    <div className="folder-name" onContextMenu={(e) => folderMenu(e, f.id)}>
                      📁 {f.name}
                    </div>
                  )}
                  {notes(byFolder.get(f.id))}
                </section>
              ))}
              {notes(byFolder.get(null))}
            </div>
          </>
        )}
        {panel === 'trash' && <TrashPanel />}
        {panel === 'settings' && <SettingsPanel />}
        <footer className="drawer-footer">
          <button className="small-btn" onClick={() => setPanel(panel === 'trash' ? 'list' : 'trash')}>
            {panel === 'trash' ? '← กลับ' : 'ถังขยะ'}
          </button>
          <button className="small-btn" onClick={() => setPanel(panel === 'settings' ? 'list' : 'settings')}>
            {panel === 'settings' ? '← กลับ' : 'ตั้งค่า'}
          </button>
        </footer>
      </aside>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  )
}
