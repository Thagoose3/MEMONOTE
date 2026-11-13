import { describe, it, expect } from 'vitest'
import { resolveExternalNoteChange } from '../../src/renderer/src/store/conflict'
import { CONFLICT_SUFFIX } from '@shared/types'
import { makeNote, doc, para } from './helpers'

const local = makeNote({ id: 'A', title: 'งาน', content: doc(para('ของเรา')) })
const disk = makeNote({ id: 'A', title: 'งาน', content: doc(para('จากดิสก์')) })

describe('resolveExternalNoteChange', () => {
  it('not dirty -> load disk, no copy', () => {
    expect(resolveExternalNoteChange(local, false, disk)).toEqual({ load: disk, conflictCopy: null })
  })

  it('dirty -> conflict copy of local with new id, load disk', () => {
    const r = resolveExternalNoteChange(local, true, disk)
    expect(r.load).toBe(disk)
    expect(r.conflictCopy).not.toBeNull()
    expect(r.conflictCopy!.id).not.toBe('A')
    expect(r.conflictCopy!.title).toBe('งาน' + CONFLICT_SUFFIX)
    expect(r.conflictCopy!.conflict).toBe(true)
    expect(r.conflictCopy!.content).toEqual(local.content)
  })

  it('removed on disk and dirty -> conflict copy, load null', () => {
    const r = resolveExternalNoteChange(local, true, null)
    expect(r.load).toBeNull()
    expect(r.conflictCopy!.title).toBe('งาน' + CONFLICT_SUFFIX)
  })

  it('removed on disk and clean -> nothing to keep', () => {
    expect(resolveExternalNoteChange(local, false, null)).toEqual({ load: null, conflictCopy: null })
  })
})
