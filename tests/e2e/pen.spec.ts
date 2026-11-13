import { test, expect, type Page } from '@playwright/test'
import { closeApp, launchApp } from './fixtures'
import { newNote } from './helpers'

const strokes = (page: Page) => page.locator('.react-flow__node-stroke')
const noteCards = (page: Page) => page.locator('.react-flow__node-note')

async function newBoard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'กระดาน', exact: true }).click()
  await page.getByRole('button', { name: 'สร้างกระดาน' }).first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

async function pane(page: Page) {
  return (await page.locator('.board-canvas').boundingBox())!
}

async function drag(page: Page, from: [number, number], to: [number, number], steps = 12): Promise<void> {
  await page.mouse.move(from[0], from[1])
  await page.mouse.down()
  await page.mouse.move(to[0], to[1], { steps })
  await page.mouse.up()
}

async function drawStroke(page: Page): Promise<void> {
  const r = await pane(page)
  await page.getByRole('button', { name: 'ปากกา' }).click()
  await drag(page, [r.x + 80, r.y + 80], [r.x + 240, r.y + 130])
  await expect(strokes(page)).toHaveCount(1)
}

async function savedBoard(page: Page) {
  const [b] = (await page.evaluate(() => window.memo.boards.list())).items
  return page.evaluate((id) => window.memo.boards.read(id), b.id)
}

test('draw stroke with mouse, relaunch, stroke present', async () => {
  const first = await launchApp()
  await newBoard(first.page)
  await drawStroke(first.page)
  await expect.poll(async () => (await savedBoard(first.page)).nodes.filter((n) => n.kind === 'stroke').length).toBe(1)
  await closeApp(first.app)

  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await second.page.getByRole('button', { name: 'กระดาน', exact: true }).click()
  await second.page.locator('.board-home').getByRole('button', { name: 'กระดานใหม่' }).click()
  await expect(strokes(second.page)).toHaveCount(1)
  await expect(strokes(second.page).locator('path')).toHaveCount(1)
  await second.app.close()
})

test('pen panel picks color and size', async () => {
  const { app, page } = await launchApp()
  await newBoard(page)
  await page.getByRole('button', { name: 'ปากกา' }).click()
  await page.getByRole('button', { name: 'สีแดง' }).click()
  await page.getByRole('button', { name: 'ขนาด L' }).click()
  const r = await pane(page)
  await drag(page, [r.x + 80, r.y + 80], [r.x + 240, r.y + 130])
  await expect.poll(async () => (await savedBoard(page)).nodes[0]).toMatchObject({ kind: 'stroke', color: '#e03131', size: 'L' })
  await app.close()
})

test('eraser removes stroke but not card', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'การ์ดอยู่', 'x')
  await newBoard(page)
  await page.getByRole('button', { name: 'เพิ่มโน้ตลงกระดาน' }).click()
  await page.getByPlaceholder('เลือกโน้ตเพื่อวางบนกระดาน').fill('การ์ดอยู่')
  await expect(page.getByRole('option').first()).toContainText('การ์ดอยู่')
  await page.keyboard.press('Enter')
  await expect(noteCards(page)).toHaveCount(1)
  await drawStroke(page)
  const r = await pane(page)
  const c = (await noteCards(page).boundingBox())!
  await page.getByRole('button', { name: 'ยางลบ' }).click()
  // vertical sweep through the stroke, then across the card
  await drag(page, [r.x + 160, r.y + 40], [r.x + 160, r.y + 180])
  await drag(page, [c.x - 20, c.y + c.height / 2], [c.x + c.width + 20, c.y + c.height / 2])
  await expect(strokes(page)).toHaveCount(0)
  await expect(noteCards(page)).toHaveCount(1)
  await app.close()
})

test('Ctrl+Z restores erased stroke, Ctrl+Y removes it again', async () => {
  const { app, page } = await launchApp()
  await newBoard(page)
  await drawStroke(page)
  const r = await pane(page)
  await page.getByRole('button', { name: 'ยางลบ' }).click()
  await drag(page, [r.x + 160, r.y + 40], [r.x + 160, r.y + 180])
  await expect(strokes(page)).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await expect(strokes(page)).toHaveCount(1)
  await page.keyboard.press('Control+y')
  await expect(strokes(page)).toHaveCount(0)
  await expect.poll(async () => (await savedBoard(page)).nodes.length).toBe(0)
  await app.close()
})

test('marquee selects stroke + card, drag moves both', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ย้ายคู่', 'x')
  await newBoard(page)
  await page.getByRole('button', { name: 'เพิ่มโน้ตลงกระดาน' }).click()
  await page.getByPlaceholder('เลือกโน้ตเพื่อวางบนกระดาน').fill('ย้ายคู่')
  await expect(page.getByRole('option').first()).toContainText('ย้ายคู่')
  await page.keyboard.press('Enter')
  await drawStroke(page)
  await page.getByRole('button', { name: 'เลือก' }).click()
  await expect.poll(async () => (await savedBoard(page)).nodes.length).toBe(2)
  const before = await savedBoard(page)
  const r = await pane(page)
  const c = (await noteCards(page).boundingBox())!
  await drag(page, [r.x + 20, r.y + 20], [c.x + c.width + 20, c.y + c.height + 20])
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(2)
  await drag(page, [c.x + c.width / 2, c.y + c.height / 2], [c.x + c.width / 2 + 100, c.y + c.height / 2 + 60])
  // both nodes move by the same amount (the drag threshold eats a few px of the 100px drag)
  await expect
    .poll(async () => {
      const after = await savedBoard(page)
      const dx = after.nodes.map((n) => Math.round(n.x - before.nodes.find((o) => o.id === n.id)!.x))
      return dx[0] === dx[1] && dx[0] >= 80
    })
    .toBe(true)
  await app.close()
})
