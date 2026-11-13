import { promises as fs } from 'node:fs'

let counter = 0

/** Write to `<path>.<n>.tmp` then rename over the target, so a crash never leaves a half-written file. */
export async function writeFileAtomic(path: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${path}.${process.pid}.${counter++}.tmp`
  await fs.writeFile(tmp, data)
  // Windows can briefly lock the target (antivirus, OneDrive/Dropbox); retry with growing delays.
  const delays = [0, 50, 100, 200, 400, 800]
  let lastErr: unknown
  for (const ms of delays) {
    if (ms) await new Promise((r) => setTimeout(r, ms))
    try {
      await fs.rename(tmp, path)
      return
    } catch (err) {
      lastErr = err
    }
  }
  await fs.rm(tmp, { force: true })
  throw lastErr
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await fs.readFile(path, 'utf8')) as T
}
