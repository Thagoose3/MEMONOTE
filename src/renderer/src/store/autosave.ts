export interface Autosaver<T> {
  schedule(v: T): void
  flush(): Promise<void>
  pending(): boolean
  cancel(): void
}

const MAX_RETRY_MS = 8000

/**
 * Debounced saver: the latest scheduled value is saved `delayMs` after the last schedule.
 * A failed save keeps its value (unless a newer one arrived), reports via `onError`, and retries with backoff.
 */
export function createAutosaver<T>(
  save: (v: T) => Promise<unknown>,
  delayMs = 500,
  onError: (err: unknown) => void = (err) => console.error('autosave failed', err)
): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: { v: T } | null = null
  let inflight: Promise<unknown> = Promise.resolve()
  let failures = 0

  const arm = (ms: number): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, ms)
  }

  function run(): Promise<unknown> {
    if (timer) clearTimeout(timer)
    timer = null
    if (!latest) return inflight
    const job = latest
    latest = null
    inflight = inflight.then(async () => {
      try {
        await save(job.v)
        failures = 0
      } catch (err) {
        failures++
        onError(err)
        if (!latest) latest = job // keep the edit unless a newer one superseded it
        arm(Math.min(1000 * 2 ** (failures - 1), MAX_RETRY_MS))
      }
    })
    return inflight
  }

  return {
    schedule(v) {
      latest = { v }
      arm(delayMs)
    },
    async flush() {
      await run()
      if (latest) await run() // one immediate retry if that save failed
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
