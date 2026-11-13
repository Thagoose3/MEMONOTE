import type { Extensions } from '@tiptap/react'
import { CopyField } from './ext/copyField'
import { WikiLink } from './ext/wikiLink'
import { PasteHtmlImages, RemoteImage } from './ext/remoteImage'
import { SlashMenu } from './slashMenu'

/** Editor extensions beyond the basics. */
export function editorExtras(): Extensions {
  return [CopyField, SlashMenu, WikiLink, RemoteImage, PasteHtmlImages]
}
