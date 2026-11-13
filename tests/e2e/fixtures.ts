import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export interface Launched {
  app: ElectronApplication
  page: Page
  vault: string
  configDir: string
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `memonote-${prefix}-`))
}

/** Launch the built app. `vault: null` means no vault configured (first run). */
export async function launchApp(opts: { vault?: string | null; configDir?: string } = {}): Promise<Launched> {
  const vault = opts.vault === undefined ? tempDir('vault') : opts.vault
  const configDir = opts.configDir ?? tempDir('config')
  const env: Record<string, string> = { ...(process.env as Record<string, string>), MEMONOTE_CONFIG_DIR: configDir }
  if (vault) env.MEMONOTE_VAULT = vault
  else delete env.MEMONOTE_VAULT
  const app = await electron.launch({ args: [resolve(__dirname, '../../out/main/index.js')], env })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page, vault: vault ?? '', configDir }
}

/** Close the app gracefully (runs flush-on-close). */
export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  await app.waitForEvent('close', { timeout: 10000 }).catch(() => undefined)
}
