import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { boardActions, registerPendingEdit, useBoard } from '../boardStore'
import { SideHandles } from './handles'

export function TextCard({ id, data, selected }: NodeProps): React.JSX.Element {
  const editing = useBoard((s) => s.editingText === id)
  const { updateNodeData } = useReactFlow()
  const ref = useRef<HTMLTextAreaElement>(null)
  const text = (data.text as string) ?? ''

  useEffect(() => {
    if (!editing) return
    ref.current?.focus()
    ref.current?.select()
    // If the app closes or the board changes before blur, commit what was typed.
    registerPendingEdit(() => {
      const v = ref.current?.value
      if (v !== undefined && v !== text) boardActions.patchNode(id, { text: v })
    })
    return () => registerPendingEdit(null)
  }, [editing, id, text])

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
            registerPendingEdit(null)
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
