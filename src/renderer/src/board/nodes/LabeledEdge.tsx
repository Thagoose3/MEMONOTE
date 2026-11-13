import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react'
import type { EdgeColor } from '@shared/types'
import { boardActions, useBoard } from '../boardStore'

export const EDGE_COLORS: Record<EdgeColor, string> = {
  gray: '#8a8f98',
  blue: '#3b5bdb',
  green: '#2f9e44',
  red: '#e03131'
}
const COLOR_NAMES: Record<EdgeColor, string> = { gray: 'เทา', blue: 'น้ำเงิน', green: 'เขียว', red: 'แดง' }

export function LabeledEdge(props: EdgeProps): React.JSX.Element {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const editing = useBoard((s) => s.editingEdge === id)
  const { updateEdgeData } = useReactFlow()
  const color = (data?.color as EdgeColor) ?? 'gray'
  const label = data?.label as string | undefined
  const stroke = EDGE_COLORS[color]

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#arrow-${color})`}
        interactionWidth={24}
        style={{ stroke, strokeWidth: selected ? 3 : 2 }}
      />
      <EdgeLabelRenderer>
        <div className="edge-label-host nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>
          {editing ? (
            <input
              autoFocus
              className="edge-label-input"
              placeholder="ป้ายเส้น"
              defaultValue={label ?? ''}
              onBlur={(e) => {
                boardActions.setEditingEdge(null)
                const v = e.target.value.trim()
                updateEdgeData(id, { label: v || undefined })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') boardActions.setEditingEdge(null)
              }}
            />
          ) : (
            label && (
              <div className="edge-label" style={{ borderColor: stroke }} onDoubleClick={() => boardActions.setEditingEdge(id)}>
                {label}
              </div>
            )
          )}
          {selected && !editing && (
            <div className="edge-colors" role="group" aria-label="สีเส้น">
              {(Object.keys(EDGE_COLORS) as EdgeColor[]).map((c) => (
                <button
                  key={c}
                  aria-label={`สี${COLOR_NAMES[c]}`}
                  className={'edge-color' + (c === color ? ' active' : '')}
                  style={{ background: EDGE_COLORS[c] }}
                  onClick={() => updateEdgeData(id, { color: c })}
                />
              ))}
              <button className="edge-color-label" onClick={() => boardActions.setEditingEdge(id)}>
                ป้าย
              </button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

/** SVG arrow markers, one per edge color. */
export function ArrowMarkers(): React.JSX.Element {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden>
      <defs>
        {(Object.keys(EDGE_COLORS) as EdgeColor[]).map((c) => (
          <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[c]} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}
