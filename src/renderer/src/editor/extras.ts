import type { Extensions } from '@tiptap/react'
import { CopyField } from './ext/copyField'
import { SlashMenu } from './slashMenu'

/** Editor extensions beyond the basics. */
export function editorExtras(): Extensions {
  return [CopyField, SlashMenu]
}
