import { boardActions, useBoard, type Tool } from './boardStore'

interface Btn {
  label: string
  aria: string
  icon: string
  tool?: Tool
  run?: () => void
}

export function Toolbar(props: { onAddNote: () => void; onAddImage: () => void }): React.JSX.Element {
  const tool = useBoard((s) => s.tool)
  const buttons: Btn[] = [
    { label: 'เลือก', aria: 'เลือก', icon: '↖', tool: 'select' },
    { label: 'เลื่อน', aria: 'เลื่อน', icon: '✋', tool: 'hand' },
    { label: 'ปากกา', aria: 'ปากกา', icon: '✏️', tool: 'pen' },
    { label: 'ยางลบ', aria: 'ยางลบ', icon: '⌫', tool: 'eraser' },
    { label: 'โน้ต', aria: 'เพิ่มโน้ตลงกระดาน', icon: '📝', run: props.onAddNote },
    { label: 'ข้อความ', aria: 'ข้อความ', icon: 'T', tool: 'text' },
    { label: 'รูป', aria: 'เพิ่มรูปลงกระดาน', icon: '🖼', run: props.onAddImage },
    { label: 'เส้นโยง', aria: 'เส้นโยง', icon: '↗', tool: 'connect' }
  ]
  return (
    <div className="board-toolbar" role="toolbar" aria-label="เครื่องมือกระดาน">
      {buttons.map((b) => (
        <button
          key={b.aria}
          aria-label={b.aria}
          title={b.label}
          aria-pressed={b.tool ? tool === b.tool : undefined}
          className={'tool-btn' + (b.tool && tool === b.tool ? ' active' : '')}
          onClick={() => (b.tool ? boardActions.setTool(b.tool) : b.run?.())}
        >
          <span className="tool-icon">{b.icon}</span>
          <span className="tool-label">{b.label}</span>
        </button>
      ))}
    </div>
  )
}
