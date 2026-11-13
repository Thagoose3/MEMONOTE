import { useSyncExternalStore } from 'react'

/** The open board publishes its title + rename here (filled in by the board view). */
export interface BoardTitle {
  title: string
  rename(title: string): void
}

let current: BoardTitle | null = null
const listeners = new Set<() => void>()

export function publishBoardTitle(b: BoardTitle | null): void {
  current = b
  listeners.forEach((l) => l())
}

export function useBoardTitle(): BoardTitle | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current
  )
}
