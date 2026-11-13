import { describe, it, expect } from 'vitest'
import { extractPlainText, extractLinkIds, firstImage } from '@shared/doc'
import { doc, para } from './helpers'

const fixture = doc(
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'หัวข้อ' }] },
  para('สวัสดี ', { type: 'wikiLink', attrs: { noteId: 'B' } }, ' และ ', { type: 'wikiLink', attrs: { noteId: 'B' } }),
  { type: 'image', attrs: { file: 'h.png', width: null } },
  { type: 'codeBlock', attrs: { language: 'js' }, content: [{ type: 'text', text: 'let x = 1' }] },
  { type: 'copyField', attrs: { label: 'admin', value: 'pass123' } },
  { type: 'image', attrs: { file: 'second.png', width: null } }
)

describe('doc extractors', () => {
  it('extractPlainText joins blocks and includes code and copy fields', () => {
    const t = extractPlainText(fixture)
    expect(t).toContain('หัวข้อ')
    expect(t).toContain('สวัสดี')
    expect(t).toContain('let x = 1')
    expect(t).toContain('admin')
    expect(t).toContain('pass123')
    expect(t.split('\n').length).toBeGreaterThanOrEqual(4)
  })

  it('extractLinkIds returns unique ids', () => {
    expect(extractLinkIds(fixture)).toEqual(['B'])
  })

  it('firstImage returns the first image file', () => {
    expect(firstImage(fixture)).toBe('h.png')
    expect(firstImage(doc(para('x')))).toBeNull()
  })
})
