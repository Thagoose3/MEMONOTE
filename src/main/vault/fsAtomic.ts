import { promises as fs } from 'node:fs'

let counter = 0

/** Write to `<path>.<n>.tmp` then rename over the target, so a crash never leaves a half-written file. */
export async function writeFileAtomic(path: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${path}.${process.pid}.${counter++}.tmp`
  await fs.writeFile(tmp, data)
  try {
    await fs.rename(tmp, path)
  } catch (err) {
    // Windows can briefly lock the target (antivirus, sync clients); retry once.
    await new Promise((r) => setTimeout(r, 50))
    try {
      await fs.rename(tmp, path)
    } catch {
      await fs.rm(tmp, { force: true })
      throw err
    }
  }
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await fs.readFile(path, 'utf8')) as T
}
