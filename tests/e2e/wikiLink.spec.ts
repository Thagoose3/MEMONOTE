import { test, expect, type Page } from '@playwright/test'
import { launchApp } from './fixtures'
import { editor, metas, newNote, titleInput } from './helpers'

const link = (page: Page) => editor(page).locator('.wiki-link')

async function sourceLinkingTarget(page: Page): Promise<void> {
  await newNote(page, 'ปลายทาง', 'เนื้อหาปลายทาง')
  await newNote(page, 'ต้นทาง', 'ดูที่ ')
  await page.keyboard.type('[[ปลาย')
  await expect(page.getByRole('option', { name: 'ปลายทาง' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(link(page)).toHaveText('ปลายทาง')
  await expect.poll(async () => (await metas(page)).find((m) => m.title === 'ต้นทาง')?.linkIds.length).toBe(1)
}

test('[[ shows suggestions, Enter inserts link with title', async () => {
  const { app, page } = await launchApp()
  await sourceLinkingTarget(page)
  await app.close()
})

test('renaming target updates link text', async () => {
  const { app, page } = await launchApp()
  await sourceLinkingTarget(page)
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'ปลายทาง', exact: true }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'เปลี่ยนชื่อ' }).click()
  await page.getByPlaceholder('ชื่อโน้ต', { exact: true }).last().fill('ปลายทางใหม่')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(link(page)).toHaveText('ปลายทางใหม่')
  await app.close()
})

test('click link opens target', async () => {
  const { app, page } = await launchApp()
  await sourceLinkingTarget(page)
  await link(page).click()
  await expect(titleInput(page)).toHaveValue('ปลายทาง')
  await app.close()
})

test('create new note from [[', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ต้นทาง', 'ไปที่ ')
  await page.keyboard.type('[[ใหม่เอี่ยม')
  await page.getByRole('option', { name: /สร้างโน้ตใหม่/ }).click()
  await expect(link(page)).toHaveText('ใหม่เอี่ยม')
  await expect(titleInput(page)).toHaveValue('ต้นทาง')
  await expect.poll(async () => (await metas(page)).map((m) => m.title).sort()).toEqual(['ต้นทาง', 'ใหม่เอี่ยม'].sort())
  await app.close()
})

test('backlinks list on target', async () => {
  const { app, page } = await launchApp()
  await sourceLinkingTarget(page)
  await link(page).click()
  const panel = page.getByLabel('ลิงก์มาจาก')
  await expect(panel).toContainText('ต้นทาง')
  await panel.getByRole('button', { name: 'ต้นทาง' }).click()
  await expect(titleInput(page)).toHaveValue('ต้นทาง')
  await app.close()
})

test('trash target -> link shows โน้ตถูกลบ; restore -> title back', async () => {
  const { app, page } = await launchApp()
  await sourceLinkingTarget(page)
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'ปลายทาง', exact: true }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'ลบ' }).click()
  await page.keyboard.press('Escape')
  await expect(link(page)).toHaveText('โน้ตถูกลบ')
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'ถังขยะ' }).click()
  await page.getByRole('button', { name: 'กู้คืน ปลายทาง' }).click()
  await page.keyboard.press('Escape')
  await expect(link(page)).toHaveText('ปลายทาง')
  await app.close()
})
