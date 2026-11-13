import type { PenSize } from '@shared/types'
import { boardActions, useBoard } from './boardStore'
import { PEN_COLORS } from './strokePath'

const COLOR_NAMES: Record<string, string> = {
  '#1f1f1f': 'ดำ',
  '#8a8f98': 'เทา',
  '#d6409f': 'ชมพู',
  '#3b5bdb': 'น้ำเงิน',
  '#1c9bef': 'ฟ้า',
  '#f08c00': 'ส้ม',
  '#2f9e44': 'เขียว',
  '#e03131': 'แดง'
}

export function PenPanel(): React.JSX.Element | null {
  const tool = useBoard((s) => s.tool)
  const color = useBoard((s) => s.penColor)
  const size = useBoard((s) => s.penSize)
  if (tool !== 'pen') return null
  return (
    <div className="pen-panel" role="group" aria-label="ตั้งค่าปากกา">
      <div className="pen-colors">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`สี${COLOR_NAMES[c]}`}
            aria-pressed={c === color}
            className={'pen-color' + (c === color ? ' active' : '')}
            style={{ background: c }}
            onClick={() => boardActions.setPen({ penColor: c })}
          />
        ))}
      </div>
      <div className="pen-sizes">
        {(['S', 'M', 'L'] as PenSize[]).map((s) => (
          <button
            key={s}
            aria-label={`ขนาด ${s}`}
            aria-pressed={s === size}
            className={'pen-size' + (s === size ? ' active' : '')}
            onClick={() => boardActions.setPen({ penSize: s })}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
