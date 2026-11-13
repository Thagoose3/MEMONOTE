import { test, expect } from '@playwright/test'
import { launchApp } from './fixtures'

test('the app window cannot be navigated away', async () => {
  const { app, page } = await launchApp()
  const url = page.url()
  await page.evaluate(() => {
    location.href = 'file:///C:/Windows/win.ini'
  })
  await page.waitForTimeout(800)
  // (Playwright waits forever on a cancelled navigation, so ask Electron directly)
  const state = await app.evaluate(async ({ BrowserWindow }) => {
    const wc = BrowserWindow.getAllWindows()[0].webContents
    return { url: wc.getURL(), ui: await wc.executeJavaScript('!!document.querySelector(".mode-switch")') }
  })
  expect(state).toEqual({ url, ui: true })
  await app.close()
})

test('window.open never creates an app window', async () => {
  const { app, page } = await launchApp()
  await page.evaluate(() => window.open('about:blank', '_blank'))
  await page.waitForTimeout(800)
  const count = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
  expect(count).toBe(1)
  await app.close()
})

test('a file dropped outside an editor does not replace the app', async () => {
  const { app, page } = await launchApp()
  const prevented = await page.evaluate(() => {
    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'a.txt', { type: 'text/plain' }))
    const over = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })
    const drop = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })
    const target = document.querySelector('.topbar')!
    target.dispatchEvent(over)
    target.dispatchEvent(drop)
    return [over.defaultPrevented, drop.defaultPrevented]
  })
  expect(prevented).toEqual([true, true])
  await app.close()
})
