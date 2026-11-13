import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DocNode, Note } from '@shared/types'

export function tempDir(prefix = 'unit'): string {
  return mkdtempSync(join(tmpdir(), `memonote-${prefix}-`))
}

export function doc(...blocks: DocNode[]): DocNode {
  return { type: 'doc', content: blocks }
}

export function para(...inline: (string | DocNode)[]): DocNode {
  return { type: 'paragraph', content: inline.map((x) => (typeof x === 'string' ? { type: 'text', text: x } : x)) }
}

export function makeNote(partial: Partial<Note> & { id: string }): Note {
  return {
    title: 'untitled',
    folder: null,
    created: 1,
    updated: 1,
    content: doc(para('')),
    ...partial
  }
}
