import { Handle, Position } from '@xyflow/react'

/** Four connection points; with ConnectionMode.Loose any of them can start or end an edge. */
export function SideHandles(): React.JSX.Element {
  return (
    <>
      <Handle type="source" id="top" position={Position.Top} className="card-handle" />
      <Handle type="source" id="right" position={Position.Right} className="card-handle" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="card-handle" />
      <Handle type="source" id="left" position={Position.Left} className="card-handle" />
    </>
  )
}
