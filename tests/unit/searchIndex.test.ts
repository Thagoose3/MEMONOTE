import { describe, it, expect } from 'vitest'
import { createSearchIndex, tokenizeThai } from '../../src/renderer/src/search/searchIndex'
import type { NoteMeta } from '@shared/types'

const meta = (id: string, title: string, text: string, updated = 1): NoteMeta => ({
  id, title, text, updated, created: 1, folder: null, linkIds: [], firstImage: null
})

describe('tokenizeThai', () => {
  it('segments thai words and lowercases latin', () => {
    const t = tokenizeThai('บัญชีทดสอบร้านกาแฟ Admin')
    expect(t).toContain('admin')
    expect(t.join('|')).toContain('ร้าน')
  })
})

describe('searchIndex', () => {
  it("finds 'ร้านกาแฟ' inside 'บัญชีทดสอบร้านกาแฟ'", () => {
    const idx = createSearchIndex()
    idx.setAll([meta('A', 'โน้ต', 'บัญชีทดสอบร้านกาแฟ'), meta('B', 'อื่น', 'ไม่เกี่ยว')])
    expect(idx.search('ร้านกาแฟ').map((r) => r.id)).toEqual(['A'])
  })

  it('title match ranks above body match', () => {
    const idx = createSearchIndex()
    idx.setAll([meta('BODY', 'อะไรก็ได้', 'login page'), meta('TITLE', 'login', 'xyz')])
    expect(idx.search('login')[0].id).toBe('TITLE')
  })

  it("finds english prefix 'adm' in 'admin'", () => {
    const idx = createSearchIndex()
    idx.setAll([meta('A', 'x', 'user admin pass 1234')])
    expect(idx.search('adm').map((r) => r.id)).toEqual(['A'])
  })

  it('upsert replaces old text', () => {
    const idx = createSearchIndex()
    idx.setAll([meta('A', 'x', 'apple')])
    idx.upsert(meta('A', 'x', 'banana'))
    expect(idx.search('apple')).toEqual([])
    expect(idx.search('banana').map((r) => r.id)).toEqual(['A'])
  })

  it('remove drops result', () => {
    const idx = createSearchIndex()
    idx.setAll([meta('A', 'x', 'apple')])
    idx.remove('A')
    expect(idx.search('apple')).toEqual([])
  })

  it('empty query returns by updated desc', () => {
    const idx = createSearchIndex()
    idx.setAll([meta('OLD', 'a', '', 1), meta('NEW', 'b', '', 9), meta('MID', 'c', '', 5)])
    expect(idx.search('').map((r) => r.id)).toEqual(['NEW', 'MID', 'OLD'])
  })

  it('result carries a snippet around the match', () => {
    const idx = createSearchIndex()
    idx.setAll([meta('A', 'x', 'บรรทัดแรก\nรหัส admin อยู่ตรงนี้\nบรรทัดสุดท้าย')])
    expect(idx.search('admin')[0].snippet).toContain('admin')
  })
})
