import { describe, it, expect } from 'vitest'
import { computeBacklinks } from '../../src/renderer/src/links/backlinks'
import type { NoteMeta } from '@shared/types'

const m = (id: string, linkIds: string[]): NoteMeta => ({
  id, linkIds, title: id, text: '', created: 1, updated: 1, folder: null, firstImage: null
})

describe('computeBacklinks', () => {
  it('A->B, C->B gives B:[A,C]', () => {
    const bl = computeBacklinks([m('A', ['B']), m('B', []), m('C', ['B'])])
    expect(bl.get('B')).toEqual(['A', 'C'])
    expect(bl.get('A') ?? []).toEqual([])
  })

  it('self link ignored', () => {
    expect(computeBacklinks([m('A', ['A'])]).get('A') ?? []).toEqual([])
  })
})
