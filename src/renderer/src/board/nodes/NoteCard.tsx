import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { useApp } from '../../store/appStore'
import { thumbUrl } from '../../editor/ext/imageNode'
import { boardActions } from '../boardStore'
import { SideHandles } from './handles'

export function NoteCard({ id, data, selected }: NodeProps): React.JSX.Element {
  const meta = useApp((s) => s.metas[data.noteId as string])
  return (
    <div className={'card note-card' + (meta ? '' : ' missing')}>
      <NodeResizer isVisible={!!selected} minWidth={140} minHeight={60} />
      <NodeToolbar isVisible={!!selected && !!meta?.linkIds.length} position={Position.Top}>
        <button className="card-tool" aria-label="เพิ่มโน้ตที่ลิงก์กันมาด้วย" title="เพิ่มโน้ตที่ลิงก์กันมาด้วย" onClick={() => boardActions.addLinked(id)}>
          🔗 เพิ่มโน้ตที่ลิงก์
        </button>
      </NodeToolbar>
      <SideHandles />
      {meta ? (
        <>
          <div className="note-card-title">{meta.title || 'ไม่มีชื่อ'}</div>
          {meta.firstImage && <img className="note-card-img" src={thumbUrl(meta.firstImage)} alt="" draggable={false} />}
          {meta.text && <div className="note-card-text">{meta.text}</div>}
        </>
      ) : (
        <div className="note-card-title muted">โน้ตถูกลบ</div>
      )}
    </div>
  )
}
