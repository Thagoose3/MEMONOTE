import { expect, type Page } from '@playwright/test'

export const titleInput = (page: Page) => page.getByLabel('ชื่อโน้ต', { exact: true })
export const editor = (page: Page) => page.getByLabel('เนื้อหา', { exact: true })

export async function newNote(page: Page, title: string, body = ''): Promise<void> {
  await page.keyboard.press('Control+n')
  await expect(titleInput(page)).toBeFocused()
  await titleInput(page).fill(title)
  await editor(page).click()
  if (body) await page.keyboard.type(body)
}

export async function metas(page: Page) {
  return (await page.evaluate(() => window.memo.notes.listMeta())).items
}

/** Build a PNG of the given size in the renderer and dispatch a paste (or drop) with it on the editor. */
export async function pastePng(page: Page, w: number, h: number, how: 'paste' | 'drop' = 'paste'): Promise<void> {
  await page.evaluate(
    async ([w, h, how]) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#3b5bdb'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#f08c00'
      ctx.fillRect(0, 0, w / 2, h / 2)
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'))
      const file = new File([blob], 'shot.png', { type: 'image/png' })
      const dt = new DataTransfer()
      dt.items.add(file)
      const el = document.querySelector('[aria-label="เนื้อหา"]') as HTMLElement
      if (how === 'paste') {
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
      } else {
        const r = el.getBoundingClientRect()
        const opts = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 }
        el.dispatchEvent(new DragEvent('dragover', opts))
        el.dispatchEvent(new DragEvent('drop', opts))
      }
    },
    [w, h, how] as const
  )
}
