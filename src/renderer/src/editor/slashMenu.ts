import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { insertImages } from './ext/imageNode'
import { popupRender, type PopupItem } from './suggestionPopup'

interface SlashItem extends PopupItem {
  keywords: string[]
  run: (editor: Editor) => void
}

function pickImages(editor: Editor): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/gif,image/webp'
  input.multiple = true
  input.onchange = () => {
    const files = Array.from(input.files ?? [])
    if (files.length) insertImages(editor.view, files)
  }
  input.click()
}

export const SLASH_ITEMS: SlashItem[] = [
  { key: 'copy', label: 'ช่องก๊อปด่วน', hint: 'Ctrl+Shift+K', keywords: ['ก๊อป', 'copy', 'รหัส', 'password'], run: (e) => e.commands.insertCopyField() },
  { key: 'code', label: 'บล็อกโค้ด', hint: '```', keywords: ['โค้ด', 'code'], run: (e) => e.chain().focus().setCodeBlock().run() },
  { key: 'image', label: 'รูปภาพ', keywords: ['รูป', 'image', 'ภาพ'], run: (e) => pickImages(e) },
  {
    key: 'table',
    label: 'ตาราง',
    keywords: ['ตาราง', 'table'],
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  { key: 'h2', label: 'หัวข้อ', hint: '##', keywords: ['หัวข้อ', 'heading'], run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: 'list', label: 'รายการ', hint: '-', keywords: ['รายการ', 'list'], run: (e) => e.chain().focus().toggleBulletList().run() },
  { key: 'todo', label: 'รายการตัวเลข', hint: '1.', keywords: ['ตัวเลข', 'number'], run: (e) => e.chain().focus().toggleOrderedList().run() }
]

export const SlashMenu = Extension.create({
  name: 'slashMenu',
  addProseMirrorPlugins() {
    return [
      Suggestion<PopupItem>({
        editor: this.editor,
        pluginKey: new PluginKey('slashMenu'),
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        allowedPrefixes: [' '],
        items: ({ query }) => {
          const q = query.toLowerCase()
          return SLASH_ITEMS.filter((it) => !q || it.label.includes(q) || it.keywords.some((k) => k.startsWith(q) || k.includes(q)))
        },
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: PopupItem }) => {
          editor.chain().focus().deleteRange(range).run()
          SLASH_ITEMS.find((it) => it.key === props.key)?.run(editor)
        },
        render: popupRender('ไม่พบคำสั่ง')
      })
    ]
  }
})
