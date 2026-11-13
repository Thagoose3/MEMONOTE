import { useReactFlow, useViewport } from '@xyflow/react'
import { useRef, useState } from 'react'
import { ulid } from 'ulid'
import type { StrokeNode, StrokePoint } from '@shared/types'
import { boardActions, useBoard } from './boardStore'
import { normalizeStroke, PEN_PX, strokeToPath } from './strokePath'
import { strokesHitBy } from './eraser'

/** Captures pointer input while the pen or eraser tool is active. */
export function PenOverlay(): React.JSX.Element | null {
  const tool = useBoard((s) => s.tool)
  const color = useBoard((s) => s.penColor)
  const size = useBoard((s) => s.penSize)
  const rf = useReactFlow()
  const { x: vx, y: vy, zoom } = useViewport()
  const [live, setLive] = useState<StrokePoint[] | null>(null)
  const [trail, setTrail] = useState<[number, number][] | null>(null)
  const fromPen = useRef(false)
  const pts = useRef<StrokePoint[]>([])
  const eraserPath = useRef<[number, number][]>([])
  const hostRef = useRef<HTMLDivElement>(null)

  if (tool !== 'pen' && tool !== 'eraser') return null

  const toFlow = (e: React.PointerEvent): [number, number] => {
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    return [p.x, p.y]
  }

  const strokesNow = (): StrokeNode[] =>
    (useBoard.getState().board?.nodes ?? []).filter((n): n is StrokeNode => n.kind === 'stroke')

  const onDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    e.preventDefault()
    hostRef.current?.setPointerCapture(e.pointerId)
    const [x, y] = toFlow(e)
    if (tool === 'pen') {
      fromPen.current = e.pointerType === 'pen'
      pts.current = [[x, y, fromPen.current ? e.pressure : 0.5]]
      setLive(pts.current)
    } else {
      eraserPath.current = [[x, y]]
      setTrail(eraserPath.current)
      useBoard.setState({ erasing: new Set(strokesHitBy(eraserPath.current, strokesNow())) })
    }
  }

  const onMove = (e: React.PointerEvent): void => {
    if (tool === 'pen' && live) {
      const [x, y] = toFlow(e)
      pts.current = [...pts.current, [x, y, fromPen.current ? e.pressure : 0.5]]
      setLive(pts.current)
    } else if (tool === 'eraser' && trail) {
      const [x, y] = toFlow(e)
      eraserPath.current = [...eraserPath.current, [x, y]]
      setTrail(eraserPath.current)
      const hits = strokesHitBy(eraserPath.current.slice(-2), strokesNow(), 8 / zoom)
      if (hits.length) {
        const next = new Set(useBoard.getState().erasing)
        hits.forEach((h) => next.add(h))
        useBoard.setState({ erasing: next })
      }
    }
  }

  const onUp = (): void => {
    if (tool === 'pen' && live) {
      const raw = pts.current
      setLive(null)
      pts.current = []
      if (!raw.length) return
      const { x, y, points } = normalizeStroke(raw)
      boardActions.addElements([{ id: ulid(), kind: 'stroke', x, y, points, color, size }])
    } else if (tool === 'eraser' && trail) {
      const ids = [...useBoard.getState().erasing]
      setTrail(null)
      eraserPath.current = []
      useBoard.setState({ erasing: new Set() })
      if (ids.length) void rf.deleteElements({ nodes: ids.map((id) => ({ id })) })
    }
  }

  const livePath = live ? strokeToPath(live, size, fromPen.current) : ''
  return (
    <div
      ref={hostRef}
      className={`pen-overlay ${tool}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <svg className="pen-live">
        <g transform={`translate(${vx} ${vy}) scale(${zoom})`}>
          {livePath && <path d={livePath} fill={color} />}
          {trail && trail.length > 1 && (
            <polyline
              points={trail.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="rgba(150,150,150,0.5)"
              strokeWidth={(PEN_PX.L * 1.5) / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>
    </div>
  )
}
