import { describe, it, expect, vi, afterEach } from 'vitest'
import { createAutosaver } from '../../src/renderer/src/store/autosave'

afterEach(() => vi.useRealTimers())

describe('createAutosaver', () => {
  it('two schedules within 500ms -> one save with latest', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    const a = createAutosaver<string>(async (v) => void saved.push(v), 500)
    a.schedule('one')
    vi.advanceTimersByTime(300)
    a.schedule('two')
    vi.advanceTimersByTime(499)
    expect(saved).toEqual([])
    expect(a.pending()).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(saved).toEqual(['two'])
    expect(a.pending()).toBe(false)
  })

  it('flush saves immediately and clears pending', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    const a = createAutosaver<string>(async (v) => void saved.push(v), 500)
    a.schedule('x')
    await a.flush()
    expect(saved).toEqual(['x'])
    expect(a.pending()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(saved).toEqual(['x'])
  })

  it('cancel drops the pending value', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    const a = createAutosaver<string>(async (v) => void saved.push(v), 500)
    a.schedule('stale')
    a.cancel()
    expect(a.pending()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    await a.flush()
    expect(saved).toEqual([])
  })

  it('a failed save keeps the value, reports it, and retries until it succeeds', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    const errors: unknown[] = []
    let failures = 2
    const a = createAutosaver<string>(
      async (v) => {
        if (failures-- > 0) throw new Error('EBUSY')
        saved.push(v)
      },
      500,
      (e) => errors.push(e)
    )
    a.schedule('edit')
    await vi.advanceTimersByTimeAsync(500)
    expect(saved).toEqual([])
    expect(errors).toHaveLength(1)
    expect(a.pending()).toBe(true)
    await vi.advanceTimersByTimeAsync(10000)
    expect(saved).toEqual(['edit'])
    expect(a.pending()).toBe(false)
  })

  it('a newer edit made while a save failed wins the retry', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    let fail = true
    const a = createAutosaver<string>(async (v) => {
      if (fail) {
        fail = false
        throw new Error('EPERM')
      }
      saved.push(v)
    }, 500, () => {})
    a.schedule('old')
    await vi.advanceTimersByTimeAsync(500)
    a.schedule('new')
    await vi.advanceTimersByTimeAsync(10000)
    expect(saved).toEqual(['new'])
  })

  it('flush retries a failed value right away', async () => {
    vi.useFakeTimers()
    const saved: string[] = []
    let fail = true
    const a = createAutosaver<string>(async (v) => {
      if (fail) {
        fail = false
        throw new Error('EBUSY')
      }
      saved.push(v)
    }, 500, () => {})
    a.schedule('x')
    await vi.advanceTimersByTimeAsync(500)
    await a.flush()
    expect(saved).toEqual(['x'])
  })

  it('flush with nothing pending does not save', async () => {
    const save = vi.fn(async () => {})
    await createAutosaver<string>(save).flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('flush waits for an in-flight save', async () => {
    vi.useFakeTimers()
    let release!: () => void
    const order: string[] = []
    const a = createAutosaver<string>(async (v) => {
      order.push('start ' + v)
      await new Promise<void>((r) => (release = r))
      order.push('end ' + v)
    }, 500)
    a.schedule('v')
    await vi.advanceTimersByTimeAsync(500)
    const f = a.flush().then(() => order.push('flushed'))
    release()
    await f
    expect(order).toEqual(['start v', 'end v', 'flushed'])
  })
})
