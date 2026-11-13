import { describe, it, expect } from 'vitest'
import { strokesHitBy } from '../../src/renderer/src/board/eraser'
import type { BoardNode, StrokeNode } from '@shared/types'

const stroke = (id: string, x: number, y: number, pts: [number, number][]): StrokeNode => ({
  id, x, y, kind: 'stroke', color: '#000', size: 'M', points: pts.map(([a, b]) => [a, b, 0.5])
})

// horizontal line from (100,100) to (200,100) in flow coords
const line = stroke('s1', 100, 100, [[0, 0], [100, 0]])

describe('strokesHitBy', () => {
  it('segment crossing stroke hits', () => {
    expect(strokesHitBy([[150, 50], [150, 150]], [line])).toEqual(['s1'])
  })

  it('path 20px away misses', () => {
    expect(strokesHitBy([[100, 124], [200, 124]], [line])).toEqual([])
  })

  it('a single eraser point near the line hits', () => {
    expect(strokesHitBy([[130, 104]], [line])).toEqual(['s1'])
  })

  it('cards are never returned', () => {
    const nodes: BoardNode[] = [{ id: 'card', x: 140, y: 90, kind: 'text', text: 'x' }, line]
    const onlyStrokes = nodes.filter((n): n is StrokeNode => n.kind === 'stroke')
    expect(strokesHitBy([[150, 50], [150, 150]], onlyStrokes)).toEqual(['s1'])
    expect(strokesHitBy([[150, 50], [150, 150]], nodes as StrokeNode[])).toEqual(['s1'])
  })
})
