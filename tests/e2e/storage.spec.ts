import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures'

test('notes saved through window.memo persist across relaunch', async () => {
  const first = await launchApp()
  await first.page.waitForFunction(() => !!window.memo?.notes)
  await first.page.evaluate(() =>
    window.memo.notes.save({
      id: 'E2E1',
      title: 'ทดสอบ',
      folder: null,
      created: 1,
      updated: 1,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'สวัสดี' }] }] }
    })
  )
  await closeApp(first.app)

  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.waitForFunction(() => !!window.memo?.notes)
  const metas = await second.page.evaluate(() => window.memo.notes.listMeta())
  expect(metas.items.map((m) => m.title)).toContain('ทดสอบ')
  await second.app.close()
})

test('memo-asset url serves saved image', async () => {
  const { app, page } = await launchApp()
  await page.waitForFunction(() => !!window.memo?.assets)
  const png = await app.evaluate(({ nativeImage }) => {
    const img = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    )
    return Array.from(img.resize({ width: 50, height: 30 }).toPNG())
  })
  const size = await page.evaluate(async (bytes) => {
    const ref = await window.memo.assets.saveImage(new Uint8Array(bytes), 'image/png')
    const img = new Image()
    img.src = `memo-asset://a/${ref.file}`
    await img.decode()
    const thumb = new Image()
    thumb.src = `memo-asset://t/${ref.file}`
    await thumb.decode()
    return [img.naturalWidth, img.naturalHeight, ref.width]
  }, png)
  expect(size).toEqual([50, 30, 50])
  await app.close()
})
