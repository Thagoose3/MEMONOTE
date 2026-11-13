import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { closeApp, launchApp, tempDir } from './fixtures'

async function newNote(page: Page, title: string, body: string): Promise<void> {
  await page.keyboard.press('Control+n')
  const t = page.getByLabel('ชื่อโน้ต', { exact: true })
  await expect(t).toBeFocused()
  await t.fill(title)
  await page.getByLabel('เนื้อหา', { exact: true }).click()
  await page.keyboard.type(body)
}

async function metas(page: Page) {
  return (await page.evaluate(() => window.memo.notes.listMeta())).items
}

test('first run without vault shows folder chooser button', async () => {
  const { app, page } = await launchApp({ vault: null })
  await expect(page.getByRole('button', { name: 'เปิดโฟลเดอร์เก็บโน้ต' })).toBeVisible()
  await app.close()
})

test('Ctrl+N, type title + body, reopen app -> note is there', async () => {
  const first = await launchApp()
  await newNote(first.page, 'บัญชีเทส', 'user admin')
  await closeApp(first.app)
  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: /บัญชีเทส/ }).click()
  await expect(second.page.getByLabel('ชื่อโน้ต', { exact: true })).toHaveValue('บัญชีเทส')
  expect((await metas(second.page))[0].text).toContain('user admin')
  await second.app.close()
})

test('close app 100ms after typing -> text persisted', async () => {
  const first = await launchApp()
  await newNote(first.page, 'เร็ว', 'พิมพ์แล้วปิดทันที')
  await first.page.waitForTimeout(100)
  await closeApp(first.app)
  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.waitForFunction(() => !!window.memo)
  const m = await metas(second.page)
  expect(m.find((x) => x.title === 'เร็ว')?.text).toContain('พิมพ์แล้วปิดทันที')
  await second.app.close()
})

test('Ctrl+P finds note by Thai word and opens it', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ร้านกาแฟ', 'บัญชีทดสอบร้านกาแฟ')
  await newNote(page, 'อื่นๆ', 'ไม่เกี่ยว')
  await page.keyboard.press('Control+p')
  await page.getByPlaceholder('ค้นหาโน้ต').fill('กาแฟ')
  await expect(page.getByRole('option').first()).toContainText('ร้านกาแฟ')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('ชื่อโน้ต', { exact: true })).toHaveValue('ร้านกาแฟ')
  await app.close()
})

test('Ctrl+P finds a note by its title right after typing it', async () => {
  const { app, page } = await launchApp()
  await page.keyboard.press('Control+n')
  await page.getByLabel('ชื่อโน้ต', { exact: true }).fill('สดใหม่')
  await page.keyboard.press('Control+p')
  await page.getByPlaceholder('ค้นหาโน้ต').fill('สดใหม่')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const all = await page.evaluate(() => window.memo.notes.listMeta())
  expect(all.items.map((m) => m.title)).toEqual(['สดใหม่'])
  await app.close()
})

test('drawer: create folder, move note into it, breadcrumb shows folder', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ย้ายฉัน', 'x')
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'โฟลเดอร์ใหม่' }).click()
  await page.getByPlaceholder('ชื่อโฟลเดอร์').fill('งานเว็บ')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'ย้ายฉัน' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'ย้ายไป งานเว็บ' }).click()
  await expect(page.getByLabel('ตำแหน่ง')).toContainText('งานเว็บ')
  await app.close()
})

test('trash then restore from ถังขยะ', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ทิ้งแล้วเก็บคืน', 'x')
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'ทิ้งแล้วเก็บคืน' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'ลบ' }).click()
  await expect.poll(async () => (await metas(page)).length).toBe(0)
  // drawer stays open after deleting
  await page.getByRole('button', { name: 'ถังขยะ' }).click()
  await page.getByRole('button', { name: 'กู้คืน ทิ้งแล้วเก็บคืน' }).click()
  await expect.poll(async () => (await metas(page)).map((m) => m.title)).toEqual(['ทิ้งแล้วเก็บคืน'])
  await app.close()
})

test('corrupt notes/bad.json -> toast shows and app usable', async () => {
  const vault = tempDir('vault')
  mkdirSync(join(vault, 'notes'), { recursive: true })
  writeFileSync(join(vault, 'notes', 'bad.json'), '{"id":')
  const { app, page } = await launchApp({ vault })
  await expect(page.getByRole('status')).toContainText('อ่านไฟล์ไม่ได้ 1 ไฟล์')
  await newNote(page, 'ยังใช้ได้', 'ok')
  await expect.poll(async () => (await metas(page)).map((m) => m.title)).toContain('ยังใช้ได้')
  await app.close()
})
