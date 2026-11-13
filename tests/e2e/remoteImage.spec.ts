import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { launchApp } from './fixtures'
import { editor, newNote } from './helpers'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

test('pasted remote image is not fetched until clicked, then saved locally', async () => {
  let hits = 0
  const server = createServer((_req, res) => {
    hits++
    res.writeHead(200, { 'content-type': 'image/png' })
    res.end(PNG)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pic.png`
  try {
    const { app, page } = await launchApp()
    await newNote(page, 'รูปเว็บ')
    await app.evaluate(
      ({ clipboard, ClipboardItem }, html) =>
        clipboard.write([new ClipboardItem({ 'text/html': html, 'text/plain': 'ข้อความ' })]),
      `<p>ข้อความ<img src="${url}"></p>`
    )
    await page.keyboard.press('Control+v')
    const box = page.getByRole('button', { name: /รูปจากเว็บ/ })
    await expect(box).toBeVisible()
    await page.waitForTimeout(500)
    expect(hits).toBe(0)
    await box.click()
    await expect(editor(page).locator('img[src^="memo-asset://a/"]')).toHaveCount(1)
    expect(hits).toBe(1)
    await expect(box).toHaveCount(0)
    await app.close()
  } finally {
    server.close()
  }
})

test('pasted html with data: image becomes a saved image', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'รูปฝัง')
  await app.evaluate(
    ({ clipboard, ClipboardItem }, html) => clipboard.write([new ClipboardItem({ 'text/html': html, 'text/plain': 'ฝัง' })]),
    `<p>ฝัง<img src="data:image/png;base64,${PNG.toString('base64')}"></p>`
  )
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('img[src^="memo-asset://a/"]')).toHaveCount(1)
  await app.close()
})
