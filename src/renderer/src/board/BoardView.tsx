import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Panel,
  ConnectionMode,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ulid } from 'ulid'
import type { BoardNode } from '@shared/types'
import { storage } from '../storage'
import { actions as app, showToast, useApp } from '../store/appStore'
import { imageFiles } from '../editor/ext/imageNode'
import { boardActions, useBoard } from './boardStore'
import { freeSpot, fromFlow, toFlow, type FlowEdge, type FlowNode } from './boardModel'
import { Toolbar } from './Toolbar'
import { NoteCard } from './nodes/NoteCard'
import { TextCard } from './nodes/TextCard'
import { ImageCard } from './nodes/ImageCard'
import { ArrowMarkers, LabeledEdge } from './nodes/LabeledEdge'
import { boardExtraNodeTypes, BoardOverlays } from './extensions'

const nodeTypes = { note: NoteCard, text: TextCard, image: ImageCard, ...boardExtraNodeTypes }
const edgeTypes = { labeled: LabeledEdge }

function ZoomLevel(): React.JSX.Element {
  const { zoom } = useViewport()
  return <div className="zoom-level">{Math.round(zoom * 100)}%</div>
}

const COMMIT_NODE_CHANGES = new Set(['remove', 'add', 'replace'])

function Canvas(): React.JSX.Element {
  const board = useBoard((s) => s.board)!
  const rev = useBoard((s) => s.rev)
  const tool = useBoard((s) => s.tool)
  const rf = useReactFlow()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>(() => toFlow(board).nodes as Node[])
  const [edges, setEdges] = useState<Edge[]>(() => toFlow(board).edges as Edge[])
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  // Reload when the board is replaced from outside the canvas.
  useEffect(() => {
    const b = useBoard.getState().board
    if (!b) return
    const f = toFlow(b)
    setNodes(f.nodes as Node[])
    setEdges(f.edges as Edge[])
  }, [rev])

  const commit = useCallback((ns: Node[], es: Edge[]) => {
    const b = useBoard.getState().board
    if (b) boardActions.commit(fromFlow(b, ns as unknown as FlowNode[], es as unknown as FlowEdge[]))
  }, [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, nodesRef.current)
      nodesRef.current = next
      setNodes(next)
      const shouldCommit = changes.some(
        (c) =>
          COMMIT_NODE_CHANGES.has(c.type) ||
          (c.type === 'position' && c.dragging === false) ||
          (c.type === 'dimensions' && c.resizing === false)
      )
      if (shouldCommit) commit(next, edgesRef.current)
    },
    [commit]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edgesRef.current)
      edgesRef.current = next
      setEdges(next)
      if (changes.some((c) => c.type !== 'select')) commit(nodesRef.current, next)
    },
    [commit]
  )

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return
      const edge: Edge = {
        id: ulid(),
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
        type: 'labeled',
        data: { color: 'gray' }
      }
      const next = [...edgesRef.current, edge]
      edgesRef.current = next
      setEdges(next)
      commit(nodesRef.current, next)
    },
    [commit]
  )

  const centerPos = useCallback(() => {
    const r = wrapRef.current!.getBoundingClientRect()
    const p = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    return { x: p.x - 110, y: p.y - 50 }
  }, [rf])

  const addImages = useCallback(
    async (files: File[], at?: { x: number; y: number }) => {
      const added: BoardNode[] = []
      for (const [i, f] of files.entries()) {
        try {
          const ref = await storage.assets.saveImage(new Uint8Array(await f.arrayBuffer()), f.type)
          const w = Math.min(320, ref.width)
          const h = Math.round((w * ref.height) / Math.max(ref.width, 1))
          const taken = [...(useBoard.getState().board?.nodes ?? []), ...added]
          const p = freeSpot(taken, at ?? centerPos(), w, h)
          added.push({ id: ulid(), kind: 'image', file: ref.file, x: p.x, y: p.y, w, h })
        } catch {
          showToast('บันทึกรูปไม่ได้')
        }
      }
      if (added.length) boardActions.addElements(added)
    },
    [centerPos]
  )

  // Paste images onto the board.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const files = imageFiles(e.clipboardData?.files)
      if (!files.length) return
      e.preventDefault()
      void addImages(files)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addImages])

  const pickNote = (): void => {
    app.openSearch((noteId) => {
      const p = freeSpot(useBoard.getState().board?.nodes ?? [], centerPos())
      boardActions.addElements([{ id: ulid(), kind: 'note', noteId, x: p.x, y: p.y }])
    })
  }

  const pickImage = (): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/gif,image/webp'
    input.multiple = true
    input.onchange = () => void addImages(Array.from(input.files ?? []))
    input.click()
  }

  const selecting = tool === 'select' || tool === 'connect' || tool === 'text'
  const drawing = tool === 'pen' || tool === 'eraser'

  return (
    <div
      ref={wrapRef}
      className={`board-canvas tool-${tool}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-memonote-note') || e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={(e) => {
        const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const noteId = e.dataTransfer.getData('application/x-memonote-note')
        if (noteId) {
          e.preventDefault()
          boardActions.addElements([{ id: ulid(), kind: 'note', noteId, x: p.x - 110, y: p.y - 30 }])
          return
        }
        const files = imageFiles(e.dataTransfer.files)
        if (files.length) {
          e.preventDefault()
          void addImages(files, p)
        }
      }}
    >
      <ArrowMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        panOnScroll
        zoomOnScroll={false}
        zoomActivationKeyCode="Control"
        panOnDrag={tool === 'hand' ? true : [1, 2]}
        selectionOnDrag={selecting}
        selectionMode={SelectionMode.Partial}
        nodesDraggable={!drawing && tool !== 'hand'}
        elementsSelectable={!drawing && tool !== 'hand'}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        zoomOnDoubleClick={false}
        onEdgeDoubleClick={(_e, edge) => boardActions.setEditingEdge(edge.id)}
        onNodeDoubleClick={(_e, node) => {
          if (node.type === 'note') {
            const id = node.data.noteId as string
            if (useApp.getState().metas[id]) void app.openNote(id)
          }
        }}
        onPaneClick={(e) => {
          if (tool !== 'text') return
          const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })
          const id = ulid()
          boardActions.addElements([{ id, kind: 'text', text: '', x: p.x, y: p.y - 20, w: 200, h: 80 }])
          boardActions.setTool('select')
          setTimeout(() => boardActions.setEditingText(id), 50)
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Panel position="bottom-left">
          <ZoomLevel />
        </Panel>
      </ReactFlow>
      <BoardOverlays />
      <Toolbar onAddNote={pickNote} onAddImage={pickImage} />
    </div>
  )
}

export function BoardView(): React.JSX.Element | null {
  const board = useBoard((s) => s.board)
  if (!board) return null
  return (
    <ReactFlowProvider key={board.id}>
      <Canvas />
    </ReactFlowProvider>
  )
}
