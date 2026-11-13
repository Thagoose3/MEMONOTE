import { describe, it, expect } from 'vitest'
import { normalizeStroke, strokeToPath, PEN_PX } from '../../src/renderer/src/board/strokePath'

describe('strokePath', () => {
  it('normalizeStroke origin at bbox min', () => {
    const r = normalizeStroke([[50, 80, 0.5], [30, 120, 0.4], [70, 90, 0.6]])
    expect(r.x).toBe(30)
    expect(r.y).toBe(80)
    expect(r.points).toEqual([[20, 0, 0.5], [0, 40, 0.4], [40, 10, 0.6]])
  })

  it('strokeToPath returns non-empty M path', () => {
    const d = strokeToPath([[0, 0, 0.5], [10, 5, 0.5], [20, 0, 0.5]], 'M', false)
    expect(d.startsWith('M')).toBe(true)
    expect(d.length).toBeGreaterThan(10)
  })

  it('a single dot still draws', () => {
    expect(strokeToPath([[5, 5, 0.5]], 'S', false).startsWith('M')).toBe(true)
  })

  it('pen sizes are 4/8/14 px', () => {
    expect(PEN_PX).toEqual({ S: 4, M: 8, L: 14 })
  })
})
