import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures'
import { editor, metas, newNote } from './helpers'

test('Ctrl+Shift+K -> type label/value -> copy -> clipboard equals value', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'บัญชีเทส')
  await page.keyboard.press('Control+Shift+k')
  await expect(page.getByPlaceholder('ชื่อ', { exact: true })).toBeFocused()
  await page.keyboard.type('admin password')
  await page.keyboard.press('Tab')
  await expect(page.getByPlaceholder('ค่า', { exact: true })).toBeFocused()
  await page.keyboard.type('P@ss-1234')
  await page.getByRole('button', { name: 'ก๊อปค่า' }).click()
  await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toBe('P@ss-1234')
  await expect(page.getByRole('button', { name: 'ก๊อปค่า' })).toHaveText('ก๊อปแล้ว')
  await app.close()
})

test('/ก๊อป Enter inserts copy field', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'สแลช')
  await page.keyboard.type('/ก๊อป')
  await expect(page.getByRole('option', { name: /ช่องก๊อปด่วน/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('[data-type="copy-field"]')).toHaveCount(1)
  await expect(editor(page)).not.toContainText('/ก๊อป')
  await app.close()
})

test('/ menu inserts a code block', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'สแลชโค้ด')
  await page.keyboard.type('/โค้ด')
  await page.keyboard.press('Enter')
  await expect(editor(page).locator('pre')).toHaveCount(1)
  await app.close()
})

test('copy field value is searchable and persists after relaunch', async () => {
  const first = await launchApp()
  await newNote(first.page, 'เก็บค่า')
  await first.page.keyboard.press('Control+Shift+k')
  await first.page.keyboard.type('token')
  await first.page.keyboard.press('Tab')
  await first.page.keyboard.type('tok_abc987')
  await expect.poll(async () => (await metas(first.page))[0]?.text ?? '').toContain('tok_abc987')
  await first.page.keyboard.press('Control+p')
  await first.page.getByPlaceholder('ค้นหาโน้ต').fill('tok_abc987')
  await expect(first.page.getByRole('option').first()).toContainText('เก็บค่า')
  await first.page.keyboard.press('Escape')
  await closeApp(first.app)

  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: /เก็บค่า/ }).click()
  await expect(second.page.getByPlaceholder('ค่า', { exact: true })).toHaveValue('tok_abc987')
  await expect(second.page.getByPlaceholder('ชื่อ', { exact: true })).toHaveValue('token')
  await second.app.close()
})
