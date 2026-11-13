import { ulid } from 'ulid'
import type { Board, BoardEdge, BoardNode, EdgeColor, NoteMeta, Side } from '@shared/types'

/** Structural subsets of React Flow's Node/Edge so this module stays free of UI imports. */
export interface FlowNode {
  id: string
  type: BoardNode['kind']
  position: { x: number; y: number }
  data: Record<string, unknown>
  width?: number
  height?: number
  [k: string]: unknown
}
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  data?: { label?: string; color?: EdgeColor; [k: string]: unknown }
  [k: string]: unknown
}

const KIND_FIELDS: Record<BoardNode['kind'], string[]> = {
  note: ['noteId'],
  text: ['text'],
  image: ['file'],
  stroke: ['points', 'color', 'size']
}

export function nodeToFlow(n: BoardNode): FlowNode {
  const data: Record<string, unknown> = {}
  for (const f of KIND_FIELDS[n.kind]) data[f] = (n as unknown as Record<string, unknown>)[f]
  return {
    id: n.id,
    type: n.kind,
    position: { x: n.x, y: n.y },
    data,
    ...(n.w !== undefined ? { width: n.w } : {}),
    ...(n.h !== undefined ? { height: n.h } : {})
  }
}

export function edgeToFlow(e: BoardEdge): FlowEdge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    ...(e.fromSide ? { sourceHandle: e.fromSide } : {}),
    ...(e.toSide ? { targetHandle: e.toSide } : {}),
    type: 'labeled',
    data: { color: e.color, ...(e.label !== undefined ? { label: e.label } : {}) }
  }
}

export function toFlow(board: Board): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return { nodes: board.nodes.map(nodeToFlow), edges: board.edges.map(edgeToFlow) }
}

function nodeFromFlow(n: FlowNode): BoardNode {
  const base: Record<string, unknown> = {
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    ...(n.width !== undefined ? { w: n.width } : {}),
    ...(n.height !== undefined ? { h: n.height } : {}),
    kind: n.type
  }
  for (const f of KIND_FIELDS[n.type]) base[f] = n.data[f]
  return base as unknown as BoardNode
}

function edgeFromFlow(e: FlowEdge): BoardEdge {
  return {
    id: e.id,
    from: e.source,
    to: e.target,
    ...(e.data?.label !== undefined ? { label: e.data.label } : {}),
    color: e.data?.color ?? 'gray',
    ...(e.sourceHandle ? { fromSide: e.sourceHandle as Side } : {}),
    ...(e.targetHandle ? { toSide: e.targetHandle as Side } : {})
  }
}

export function fromFlow(board: Board, nodes: FlowNode[], edges: FlowEdge[]): Board {
  return { ...board, nodes: nodes.map(nodeFromFlow), edges: edges.map(edgeFromFlow) }
}

export const RING_RADIUS = 260
export const CARD_W = 220
export const CARD_H = 100
const GAP = 40

function rectOf(n: BoardNode): { x: number; y: number; w: number; h: number } | null {
  if (n.kind === 'stroke') return null
  return { x: n.x, y: n.y, w: n.w ?? CARD_W, h: n.h ?? CARD_H }
}

/** First spot at or to the right of `want` (wrapping to new rows) where a default-size card overlaps nothing. */
export function freeSpot(nodes: readonly BoardNode[], want: { x: number; y: number }, w = CARD_W, h = CARD_H): { x: number; y: number } {
  const rects = nodes.map(rectOf).filter((r): r is NonNullable<typeof r> => !!r)
  const hits = (x: number, y: number) =>
    rects.find((r) => x < r.x + r.w + GAP && x + w + GAP > r.x && y < r.y + r.h + GAP && y + h + GAP > r.y)
  let { x, y } = want
  for (let i = 0; i < 200; i++) {
    const r = hits(x, y)
    if (!r) return { x, y }
    x = r.x + r.w + GAP
    if (i % 6 === 5) {
      x = want.x
      y += h + GAP
    }
  }
  return { x, y }
}

/** Bring the notes a card `[[links]]` to onto the board around it, connected by edges. */
export function addLinkedNotes(board: Board, cardId: string, metas: Map<string, NoteMeta>): Board {
  const card = board.nodes.find((n) => n.id === cardId)
  if (!card || card.kind !== 'note') return board
  const targets = (metas.get(card.noteId)?.linkIds ?? []).filter((id) => id !== card.noteId && metas.has(id))
  const nodes = [...board.nodes]
  const edges = [...board.edges]
  const missing = targets.filter((id) => !nodes.some((n) => n.kind === 'note' && n.noteId === id))
  missing.forEach((noteId, i) => {
    const a = (2 * Math.PI * i) / missing.length - Math.PI / 2
    nodes.push({ id: ulid(), kind: 'note', noteId, x: card.x + RING_RADIUS * Math.cos(a), y: card.y + RING_RADIUS * Math.sin(a) })
  })
  for (const noteId of targets) {
    const other = nodes.find((n) => n.kind === 'note' && n.noteId === noteId)!
    const linked = edges.some((e) => (e.from === card.id && e.to === other.id) || (e.from === other.id && e.to === card.id))
    if (!linked) edges.push({ id: ulid(), from: card.id, to: other.id, color: 'gray' })
  }
  if (nodes.length === board.nodes.length && edges.length === board.edges.length) return board
  return { ...board, nodes, edges }
}
