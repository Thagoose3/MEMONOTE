import { test, expect, type Page } from '@playwright/test'
import { closeApp, launchApp } from './fixtures'
import { newNote, titleInput } from './helpers'

const card = (page: Page, text: string) => page.locator('.react-flow__node', { hasText: text })

async function toBoard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'กระดาน', exact: true }).click()
}

async function newBoard(page: Page): Promise<void> {
  await toBoard(page)
  await page.getByRole('button', { name: 'สร้างกระดาน' }).first().click()
  await expect(page.locator('.react-flow')).toBeVisible()
}

async function addNoteCard(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'เพิ่มโน้ตลงกระดาน' }).click()
  await page.getByPlaceholder('เลือกโน้ตเพื่อวางบนกระดาน').fill(title)
  await expect(page.getByRole('option').first()).toContainText(title)
  await page.keyboard.press('Enter')
  await expect(card(page, title)).toBeVisible()
}

async function connect(page: Page, from: string, to: string): Promise<void> {
  const a = await card(page, from).boundingBox()
  const b = await card(page, to).boundingBox()
  await card(page, from).hover()
  const handle = card(page, from).locator('.react-flow__handle-right')
  const h = await handle.boundingBox()
  await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2)
  await page.mouse.down()
  await page.mouse.move((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, { steps: 5 })
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 5 })
  const t = await card(page, to).locator('.react-flow__handle-left').boundingBox()
  await page.mouse.move(t!.x + t!.width / 2, t!.y + t!.height / 2, { steps: 3 })
  await page.mouse.up()
}

async function boards(page: Page) {
  const list = (await page.evaluate(() => window.memo.boards.list())).items
  return Promise.all(list.map((b) => page.evaluate((id) => window.memo.boards.read(id), b.id)))
}

test('create board, add two note cards, connect, label edge, relaunch -> same', async () => {
  const first = await launchApp()
  await newNote(first.page, 'ก้อนหนึ่ง', 'a')
  await newNote(first.page, 'ก้อนสอง', 'b')
  await newBoard(first.page)
  await addNoteCard(first.page, 'ก้อนหนึ่ง')
  await addNoteCard(first.page, 'ก้อนสอง')
  await connect(first.page, 'ก้อนหนึ่ง', 'ก้อนสอง')
  await expect(first.page.locator('.react-flow__edge')).toHaveCount(1)
  await first.page.locator('.react-flow__edge-interaction').first().dblclick({ force: true })
  await first.page.getByPlaceholder('ป้ายเส้น').fill('ใช้')
  await first.page.keyboard.press('Enter')
  await expect(first.page.locator('.edge-label')).toHaveText('ใช้')
  await expect.poll(async () => (await boards(first.page))[0]?.edges[0]?.label).toBe('ใช้')
  await closeApp(first.app)

  const second = await launchApp({ vault: first.vault, configDir: first.configDir })
  await toBoard(second.page)
  await second.page.locator('.board-home').getByRole('button', { name: 'กระดานใหม่' }).click()
  await expect(card(second.page, 'ก้อนหนึ่ง')).toBeVisible()
  await expect(card(second.page, 'ก้อนสอง')).toBeVisible()
  await expect(second.page.locator('.react-flow__edge')).toHaveCount(1)
  await expect(second.page.locator('.edge-label')).toHaveText('ใช้')
  await second.app.close()
})

test('double-click card opens note in note mode', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'เปิดจากกระดาน', 'x')
  await newBoard(page)
  await addNoteCard(page, 'เปิดจากกระดาน')
  await card(page, 'เปิดจากกระดาน').dblclick()
  await expect(titleInput(page)).toHaveValue('เปิดจากกระดาน')
  await app.close()
})

test('paste image onto board creates image card', async () => {
  const { app, page } = await launchApp()
  await newBoard(page)
  await page.locator('.react-flow__pane').click()
  await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 80
    c.height = 50
    c.getContext('2d')!.fillRect(0, 0, 80, 50)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }))
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.locator('.react-flow__node-image img')).toHaveCount(1)
  await expect.poll(async () => (await boards(page))[0]?.nodes.filter((n) => n.kind === 'image').length).toBe(1)
  await app.close()
})

test('delete note -> card shows โน้ตถูกลบ, no crash', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'จะถูกลบ', 'x')
  await newBoard(page)
  await addNoteCard(page, 'จะถูกลบ')
  await page.getByRole('button', { name: 'โน้ต', exact: true }).click()
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('button', { name: 'จะถูกลบ', exact: true }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'ลบ' }).click()
  await page.keyboard.press('Escape')
  await toBoard(page)
  await expect(page.locator('.react-flow__node-note')).toContainText('โน้ตถูกลบ')
  await app.close()
})

test('mode switch keeps last open note and board', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'โน้ตค้าง', 'x')
  await newBoard(page)
  await page.getByRole('button', { name: 'โน้ต', exact: true }).click()
  await expect(titleInput(page)).toHaveValue('โน้ตค้าง')
  await toBoard(page)
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.getByLabel('ตำแหน่ง')).toContainText('กระดานใหม่')
  await app.close()
})

test('resize card persists size', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ขยายฉัน', 'x')
  await newBoard(page)
  await addNoteCard(page, 'ขยายฉัน')
  await card(page, 'ขยายฉัน').click()
  const before = (await card(page, 'ขยายฉัน').boundingBox())!
  const grip = page.locator('.react-flow__resize-control.handle.bottom.right')
  const g = (await grip.boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + 120, g.y + 60, { steps: 6 })
  await page.mouse.up()
  await expect.poll(async () => (await card(page, 'ขยายฉัน').boundingBox())!.width).toBeGreaterThan(before.width + 80)
  await expect.poll(async () => (await boards(page))[0]?.nodes[0]?.w ?? 0).toBeGreaterThan(before.width + 80)
  await app.close()
})

test('add linked notes button brings linked cards with edges', async () => {
  const { app, page } = await launchApp()
  await newNote(page, 'ลูก', 'x')
  await newNote(page, 'แม่', 'ดู ')
  await page.keyboard.type('[[ลูก')
  await page.keyboard.press('Enter')
  await newBoard(page)
  await addNoteCard(page, 'แม่')
  await card(page, 'แม่').click()
  await page.getByRole('button', { name: 'เพิ่มโน้ตที่ลิงก์กันมาด้วย' }).click()
  await expect(card(page, 'ลูก')).toBeVisible()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  await app.close()
})
