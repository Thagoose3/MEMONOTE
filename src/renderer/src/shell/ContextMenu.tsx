import { useEffect } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

export function ContextMenu(props: { x: number; y: number; items: MenuItem[]; onClose: () => void }): React.JSX.Element {
  useEffect(() => {
    const close = (): void => props.onClose()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [props])
  const top = Math.min(props.y, window.innerHeight - 40 * props.items.length - 16)
  return (
    <ul className="context-menu" role="menu" style={{ left: props.x, top }} onMouseDown={(e) => e.stopPropagation()}>
      {props.items.map((it) => (
        <li key={it.label} role="none">
          <button
            role="menuitem"
            className={it.danger ? 'danger' : ''}
            onClick={() => {
              props.onClose()
              it.onSelect()
            }}
          >
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
