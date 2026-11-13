export interface Autosaver<T> {
  schedule(v: T): void
  flush(): Promise<void>
  pending(): boolean
  cancel(): void
}

/** Debounced saver: the latest scheduled value is saved `delayMs` after the last schedule. */
export function createAutosaver<T>(save: (v: T) => Promise<unknown>, delayMs = 500): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: { v: T } | null = null
  let inflight: Promise<unknown> = Promise.resolve()

  const run = (): Promise<unknown> => {
    if (timer) clearTimeout(timer)
    timer = null
    if (!latest) return inflight
    const { v } = latest
    latest = null
    inflight = inflight.then(() => save(v)).catch((err) => console.error('autosave failed', err))
    return inflight
  }

  return {
    schedule(v) {
      latest = { v }
      if (timer) clearTimeout(timer)
      timer = setTimeout(run, delayMs)
    },
    async flush() {
      await run()
    },
    pending() {
      return latest !== null
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      latest = null
    }
  }
}
