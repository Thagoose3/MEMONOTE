import { describe, it, expect } from 'vitest'
import { createHistory } from '../../src/renderer/src/board/history'

describe('createHistory', () => {
  it('undo/redo sequence', () => {
    const h = createHistory<string>()
    h.push('a')
    h.push('b')
    h.push('c')
    expect(h.canUndo).toBe(true)
    expect(h.undo()).toBe('b')
    expect(h.undo()).toBe('a')
    expect(h.undo()).toBeNull()
    expect(h.canUndo).toBe(false)
    expect(h.redo()).toBe('b')
    expect(h.redo()).toBe('c')
    expect(h.redo()).toBeNull()
  })

  it('push after undo clears redo', () => {
    const h = createHistory<string>()
    h.push('a')
    h.push('b')
    h.undo()
    h.push('x')
    expect(h.canRedo).toBe(false)
    expect(h.undo()).toBe('a')
  })

  it('limit drops oldest', () => {
    const h = createHistory<number>(3)
    ;[1, 2, 3, 4, 5].forEach((n) => h.push(n))
    expect(h.undo()).toBe(4)
    expect(h.undo()).toBe(3)
    expect(h.undo()).toBeNull()
  })

  it('reset starts a new history from a snapshot', () => {
    const h = createHistory<string>()
    h.push('a')
    h.push('b')
    h.reset('z')
    expect(h.canUndo).toBe(false)
    h.push('y')
    expect(h.undo()).toBe('z')
  })
})
