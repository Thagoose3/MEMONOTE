export interface History<T> {
  /** Record a new current state (clears redo). */
  push(s: T): void
  /** Move back one state; returns it, or null if there is nothing to undo. */
  undo(): T | null
  redo(): T | null
  /** Forget everything; `s` becomes the only (current) state. */
  reset(s: T): void
  readonly canUndo: boolean
  readonly canRedo: boolean
}

export function createHistory<T>(limit = 100): History<T> {
  let states: T[] = []
  let index = -1
  return {
    push(s) {
      states = states.slice(0, index + 1)
      states.push(s)
      if (states.length > limit) states.shift()
      index = states.length - 1
    },
    undo() {
      if (index <= 0) return null
      index--
      return states[index]
    },
    redo() {
      if (index >= states.length - 1) return null
      index++
      return states[index]
    },
    reset(s) {
      states = [s]
      index = 0
    },
    get canUndo() {
      return index > 0
    },
    get canRedo() {
      return index < states.length - 1
    }
  }
}
