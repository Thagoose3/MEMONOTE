import { describe, it, expect } from 'vitest'
import { addLinkedNotes, CARD_W, freeSpot, fromFlow, toFlow } from '../../src/renderer/src/board/boardModel'
import type { Board, NoteMeta } from '@shared/types'

const board: Board = {
  id: 'B',
  title: 'กระดาน',
  created: 1,
  updated: 2,
  nodes: [
    { id: 'n1', x: 0, y: 0, kind: 'note', noteId: 'A' },
    { id: 't1', x: 100, y: 50, w: 200, h: 80, kind: 'text', text: 'สวัสดี' },
    { id: 'i1', x: -40, y: 300, w: 240, h: 160, kind: 'image', file: 'h.png' },
    { id: 's1', x: 5, y: 6, kind: 'stroke', points: [[0, 0, 0.5], [3, 4, 0.6]], color: '#e03131', size: 'L' }
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 't1', label: 'ใช้', color: 'blue', fromSide: 'right', toSide: 'left' },
    { id: 'e2', from: 't1', to: 'i1', color: 'gray' }
  ]
}

const meta = (id: string, linkIds: string[]): NoteMeta => ({
  id, linkIds, title: id, text: '', created: 1, updated: 1, folder: null, firstImage: null
})

describe('freeSpot', () => {
  it('returns the wanted point when it is free', () => {
    expect(freeSpot([], { x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
  })

  it('moves right past a card that would overlap', () => {
    const nodes = [{ id: 'a', x: 0, y: 0, kind: 'note', noteId: 'A' } as const]
    const p = freeSpot(nodes, { x: 30, y: 30 })
    expect(p.y).toBe(30)
    expect(p.x).toBeGreaterThanOrEqual(0 + CARD_W + 40)
  })

  it('respects explicit card sizes', () => {
    const nodes = [{ id: 'a', x: 0, y: 0, w: 600, h: 100, kind: 'text', text: '' } as const]
    expect(freeSpot(nodes, { x: 100, y: 0 }).x).toBeGreaterThanOrEqual(640)
  })
})

describe('boardModel', () => {
  it('toFlow/fromFlow round trip is identity', () => {
    const { nodes, edges } = toFlow(board)
    expect(fromFlow(board, nodes, edges)).toEqual(board)
  })

  it('toFlow maps kinds to node types and sizes', () => {
    const { nodes, edges } = toFlow(board)
    expect(nodes.map((n) => n.type)).toEqual(['note', 'text', 'image', 'stroke'])
    expect(nodes[1]).toMatchObject({ position: { x: 100, y: 50 }, width: 200, height: 80 })
    expect(edges[0]).toMatchObject({ source: 'n1', target: 't1', sourceHandle: 'right', targetHandle: 'left' })
  })

  it('addLinkedNotes adds missing linked cards with edges', () => {
    const metas = new Map([
      ['A', meta('A', ['B', 'C', 'GONE'])],
      ['B', meta('B', [])],
      ['C', meta('C', [])]
    ])
    const b: Board = { ...board, nodes: [board.nodes[0]], edges: [] }
    const out = addLinkedNotes(b, 'n1', metas)
    const notes = out.nodes.filter((n) => n.kind === 'note').map((n) => (n as { noteId: string }).noteId)
    expect(notes.sort()).toEqual(['A', 'B', 'C'])
    expect(out.edges).toHaveLength(2)
    expect(out.edges.every((e) => e.from === 'n1')).toBe(true)
    const added = out.nodes.filter((n) => n.id !== 'n1')
    for (const n of added) expect(Math.round(Math.hypot(n.x - 0, n.y - 0))).toBe(260)
  })

  it('addLinkedNotes is idempotent', () => {
    const metas = new Map([
      ['A', meta('A', ['B'])],
      ['B', meta('B', [])]
    ])
    const b: Board = { ...board, nodes: [board.nodes[0]], edges: [] }
    const once = addLinkedNotes(b, 'n1', metas)
    expect(addLinkedNotes(once, 'n1', metas)).toEqual(once)
  })

  it('addLinkedNotes links to a card already on the board instead of duplicating it', () => {
    const metas = new Map([
      ['A', meta('A', ['B'])],
      ['B', meta('B', [])]
    ])
    const b: Board = {
      ...board,
      nodes: [board.nodes[0], { id: 'nb', x: 500, y: 0, kind: 'note', noteId: 'B' }],
      edges: []
    }
    const out = addLinkedNotes(b, 'n1', metas)
    expect(out.nodes).toHaveLength(2)
    expect(out.edges).toMatchObject([{ from: 'n1', to: 'nb' }])
  })
})
