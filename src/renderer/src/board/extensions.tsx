import type { NodeTypes } from '@xyflow/react'
import { useEffect } from 'react'
import { StrokeNodeView } from './nodes/StrokeNode'
import { PenOverlay } from './PenOverlay'
import { PenPanel } from './PenPanel'
import { boardActions } from './boardStore'

export const boardExtraNodeTypes: NodeTypes = { stroke: StrokeNodeView }

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** Pen/eraser overlay, pen settings and undo/redo shortcuts (rendered inside the ReactFlow provider). */
export function BoardOverlays(): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || isTyping(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        boardActions.undo()
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault()
        boardActions.redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <PenOverlay />
      <PenPanel />
    </>
  )
}
