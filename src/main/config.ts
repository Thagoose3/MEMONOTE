import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AppConfig {
  vaultPath: string | null
}

export function getConfigDir(): string {
  const dir = process.env.MEMONOTE_CONFIG_DIR || app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function readAppConfig(): AppConfig {
  if (process.env.MEMONOTE_VAULT) return { vaultPath: process.env.MEMONOTE_VAULT }
  try {
    const raw = JSON.parse(readFileSync(join(getConfigDir(), 'config.json'), 'utf8'))
    return { vaultPath: typeof raw.vaultPath === 'string' ? raw.vaultPath : null }
  } catch {
    return { vaultPath: null }
  }
}

export function writeAppConfig(c: AppConfig): void {
  writeFileSync(join(getConfigDir(), 'config.json'), JSON.stringify(c, null, 2))
}
