import type { NodeProps } from '@xyflow/react'
import { memo, useMemo } from 'react'
import type { PenSize, StrokePoint } from '@shared/types'
import { PEN_PX, strokeToPath } from '../strokePath'
import { useBoard } from '../boardStore'

export const StrokeNodeView = memo(function StrokeNodeView({ id, data, selected }: NodeProps): React.JSX.Element {
  const points = data.points as StrokePoint[]
  const size = data.size as PenSize
  const color = data.color as string
  const erasing = useBoard((s) => s.erasing.has(id))
  const d = useMemo(() => strokeToPath(points, size, false), [points, size])
  const pad = PEN_PX[size]
  const w = Math.max(...points.map((p) => p[0])) + pad
  const h = Math.max(...points.map((p) => p[1])) + pad
  return (
    <svg
      className={'stroke-svg' + (selected ? ' selected' : '') + (erasing ? ' erasing' : '')}
      width={w}
      height={h}
      style={{ overflow: 'visible' }}
    >
      <path d={d} fill={color} />
    </svg>
  )
})
