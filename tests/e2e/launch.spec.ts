import { test, expect } from '@playwright/test'
import { launchApp } from './fixtures'

test('opens window with top bar and mode switch', async () => {
  const { app, page } = await launchApp()
  await expect(page.getByRole('button', { name: 'โน้ต', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'กระดาน', exact: true })).toBeVisible()
  const menuVisible = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMenuBarVisible())
  expect(menuVisible).toBe(false)
  await app.close()
})
