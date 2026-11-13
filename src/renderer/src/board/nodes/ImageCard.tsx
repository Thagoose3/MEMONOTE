import { NodeResizer, type NodeProps } from '@xyflow/react'
import { thumbUrl } from '../../editor/ext/imageNode'
import { SideHandles } from './handles'

export function ImageCard({ data, selected }: NodeProps): React.JSX.Element {
  return (
    <div className="card image-card">
      <NodeResizer isVisible={!!selected} minWidth={60} minHeight={40} keepAspectRatio />
      <SideHandles />
      <img src={thumbUrl(data.file as string)} alt="" draggable={false} />
    </div>
  )
}
