/** In-flight image uploads, so flush() can wait for them and opened notes can tell orphans from live ones. */
const pending = new Map<string, Promise<void>>()

export function trackUpload(uploadId: string, work: Promise<void>): void {
  const p = work.finally(() => pending.delete(uploadId))
  pending.set(uploadId, p)
}

export function pendingUploadIds(): Set<string> {
  return new Set(pending.keys())
}

export async function waitForUploads(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending.values()])
}
