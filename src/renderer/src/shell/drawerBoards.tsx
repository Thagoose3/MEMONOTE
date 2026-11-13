import { useState } from 'react'
import { useApp } from '../store/appStore'
import { boardActions } from '../board/boardStore'
import { ContextMenu, type MenuItem } from './ContextMenu'

export function BoardList(): React.JSX.Element {
  const boards = useApp((s) => s.boards)
  const openId = useApp((s) => s.openBoardId)
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const sorted = [...boards].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'th'))
  return (
    <>
      <div className="drawer-actions">
        <button className="drawer-primary" onClick={() => void boardActions.create()}>
          ＋ สร้างกระดาน
        </button>
      </div>
      <div className="drawer-scroll">
        {!sorted.length && <p className="drawer-muted">ยังไม่มีกระดาน</p>}
        {sorted.map((b) =>
          renaming === b.id ? (
            <input
              key={b.id}
              autoFocus
              className="drawer-input"
              placeholder="ชื่อกระดาน"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setRenaming(null)
                if (draft.trim()) void boardActions.renameById(b.id, draft.trim())
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setRenaming(null)
              }}
            />
          ) : (
            <button
              key={b.id}
              className={'drawer-item' + (openId === b.id ? ' current' : '')}
              onClick={() => void boardActions.open(b.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    {
                      label: 'เปลี่ยนชื่อ',
                      onSelect: () => {
                        setDraft(b.title)
                        setRenaming(b.id)
                      }
                    },
                    { label: 'ลบ', danger: true, onSelect: () => void boardActions.trash(b.id) }
                  ]
                })
              }}
            >
              {b.title || 'ไม่มีชื่อ'}
            </button>
          )
        )}
      </div>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  )
}
