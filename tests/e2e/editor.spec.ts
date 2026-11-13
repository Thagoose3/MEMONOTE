import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures'
import { editor, metas, newNote, pastePng } from './helpers'

const savedImg = (page: import('@playwright/test').Page) => editor(page).locator('img[src^="memo-asset://a/"]')

test('paste png from clipboard inserts image that survives relaunch', async () => {
  const first = await launchApp()
  await newNote(first.page, 'มีรูป', 'ก่อนรูป ')
  await pastePng(first.page, 120, 80)
  await expect(savedImg(first.page)).toHaveCount(1)
  await expect.poll(async () => (await metas(first.page))[0].firstImage).toMatch(/\.png$/)
  await closeApp(first.app)

  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: /มีรูป/ }).click()
  const img = savedImg(second.page)
  await expect(img).toHaveCount(1)
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(120)
  await second.app.close()
})

for (const [kind, mime, data] of [
  ['GIF', 'image/gif', 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'],
  ['WebP', 'image/webp', 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=']
] as const) {
  test(`paste real ${kind} bytes inserts a saved image`, async () => {
    const { app, page } = await launchApp()
    await newNote(page, `รูป ${kind}`, 'x ')
    await page.evaluate(
      ([mime, data]) => {
        const bin = atob(data)
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
        const dt = new DataTransfer()
        dt.items.add(new File([bytes], 'a', { type: mime }))
        document
          .querySelector('[aria-label="เนื้อหา"]')!
          .dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
      },
      [mime, data] as const
    )
    await expect(savedImg(page)).toHaveCount(1)
    await app.close()
  })
}

test('paste big image then close the app immediately -> image still saved in the note', async () => {
  const first = await launchApp()
  await newNote(first.page, 'รูปแล้วรีบไป', 'x ')
  await pastePng(first.page, 8000, 5000)
  await closeApp(first.app) // leave while the image is still being saved
  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: /รูปแล้วรีบไป/ }).click()
  await expect(savedImg(second.page)).toHaveCount(1)
  await expect(editor(second.page)).not.toContainText('กำลังบันทึกรูป')
  await second.app.close()
})

test('a placeholder left without a pending upload is removed when the note opens', async () => {
  const first = await launchApp()
  await first.page.evaluate(() =>
    window.memo.notes.save({
      id: 'ORPHAN',
      title: 'ค้างอยู่',
      folder: null,
      created: 1,
      updated: 1,
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'ก่อน' }] },
          { type: 'image', attrs: { file: null, width: null, uploadId: 'gone' } }
        ]
      }
    })
  )
  await closeApp(first.app)
  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: /ค้างอยู่/ }).click()
  await expect(editor(second.page)).toContainText('ก่อน')
  await expect(editor(second.page)).not.toContainText('กำลังบันทึกรูป')
  await second.app.close()
})

test('drop image file inserts image', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ลากรูป', 'x')
  await pastePng(page, 60, 60, 'drop')
  await expect(savedImg(page)).toHaveCount(1)
  await app.close()
})

test('paste 8000x5000 png: editor responds while saving; stored image width 4000', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'รูปใหญ่', 'start ')
  await pastePng(page, 8000, 5000)
  await page.keyboard.type('typing-while-saving')
  await expect(editor(page)).toContainText('typing-while-saving', { timeout: 1500 })
  const img = savedImg(page)
  await expect(img).toHaveCount(1, { timeout: 20000 })
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth), { timeout: 10000 }).toBe(4000)
  await app.close()
})

test('```js creates highlighted code block; copy button copies its text', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'โค้ด')
  await page.keyboard.type('```js ')
  await page.keyboard.type('const answer = 42')
  const block = editor(page).locator('pre')
  await expect(block).toContainText('const answer = 42')
  await expect(block.locator('.hljs-keyword').first()).toHaveText('const')
  await expect(page.getByLabel('ภาษา')).toHaveValue('javascript')
  await page.getByRole('button', { name: 'ก๊อปโค้ด' }).click()
  await expect.poll(() => app.evaluate(({ clipboard }) => clipboard.readText())).toBe('const answer = 42')
  await app.close()
})

test('pasted html heading and list keep formatting', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'วางเว็บ')
  await app.evaluate(({ clipboard, ClipboardItem }) =>
    clipboard.write([new ClipboardItem({ 'text/html': '<h2>หัวข้อเว็บ</h2><ul><li>หนึ่ง</li><li>สอง</li></ul>', 'text/plain': 'หัวข้อเว็บ\nหนึ่ง\nสอง' })])
  )
  await page.keyboard.press('Control+v')
  await expect(editor(page).locator('h2')).toHaveText('หัวข้อเว็บ')
  await expect(editor(page).locator('li')).toHaveCount(2)
  await app.close()
})

test('Ctrl+Shift+V pastes html as plain text', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'วางล้วน')
  await app.evaluate(({ clipboard, ClipboardItem }) => clipboard.write([new ClipboardItem({ 'text/html': '<h2><b>ตัวหนา</b></h2>', 'text/plain': 'ตัวหนา' })]))
  await page.keyboard.press('Control+Shift+v')
  await expect(editor(page)).toContainText('ตัวหนา')
  await expect(editor(page).locator('h2, strong')).toHaveCount(0)
  await app.close()
})
