import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { boardActions, useBoard } from '../boardStore'
import { SideHandles } from './handles'

export function TextCard({ id, data, selected }: NodeProps): React.JSX.Element {
  const editing = useBoard((s) => s.editingText === id)
  const { updateNodeData } = useReactFlow()
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])
  const text = (data.text as string) ?? ''
  return (
    <div className="card text-card" onDoubleClick={() => boardActions.setEditingText(id)}>
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={40} />
      <SideHandles />
      {editing ? (
        <textarea
          ref={ref}
          className="text-card-input nodrag nowheel"
          aria-label="ข้อความบนกระดาน"
          defaultValue={text}
          onBlur={(e) => {
            boardActions.setEditingText(null)
            if (e.target.value !== text) updateNodeData(id, { text: e.target.value })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
          }}
        />
      ) : (
        <div className="text-card-body">{text || <span className="muted">ดับเบิลคลิกเพื่อพิมพ์</span>}</div>
      )}
    </div>
  )
}
