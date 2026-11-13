import { useEffect, useMemo, useState } from 'react'
import { actions, searchIndex, useApp } from '../store/appStore'
import { UNTITLED } from './TopBar'

export function QuickSearch(): React.JSX.Element | null {
  const { open, onPick } = useApp((s) => s.search)
  const metas = useApp((s) => s.metas)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
    }
  }, [open])

  const results = useMemo(() => (open ? searchIndex.search(q, 30) : []), [q, open, metas])
  const options = [
    ...results.map((r) => ({ key: r.id, title: r.title || UNTITLED, snippet: r.snippet, create: false })),
    ...(q.trim() ? [{ key: '__create', title: `สร้างโน้ต “${q.trim()}”`, snippet: '', create: true }] : [])
  ]

  if (!open) return null

  const choose = async (i: number): Promise<void> => {
    const o = options[i]
    if (!o) return
    actions.closeSearch()
    if (o.create) {
      const note = await actions.newNote({ title: q.trim(), open: !onPick })
      onPick?.(note.id)
    } else if (onPick) {
      onPick(o.key)
    } else {
      await actions.openNote(o.key)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => actions.closeSearch()}>
      <div className="quick-search" role="dialog" aria-label="ค้นหา" onMouseDown={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder={onPick ? 'เลือกโน้ตเพื่อวางบนกระดาน' : 'ค้นหาโน้ต'}
          aria-label="ค้นหาโน้ต"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSel((s) => Math.min(s + 1, options.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSel((s) => Math.max(s - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              void choose(sel)
            } else if (e.key === 'Escape') {
              actions.closeSearch()
            }
          }}
        />
        <ul role="listbox" className="qs-list">
          {options.map((o, i) => (
            <li
              key={o.key}
              role="option"
              aria-selected={i === sel}
              className={(i === sel ? 'selected ' : '') + (o.create ? 'create' : '')}
              onMouseEnter={() => setSel(i)}
              onClick={() => void choose(i)}
            >
              <div className="qs-title">{o.title}</div>
              {o.snippet && <div className="qs-snippet">{o.snippet}</div>}
            </li>
          ))}
          {!options.length && <li className="qs-empty">ยังไม่มีโน้ต</li>}
        </ul>
      </div>
    </div>
  )
}
