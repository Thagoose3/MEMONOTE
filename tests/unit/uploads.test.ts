import { describe, it, expect } from 'vitest'
import { fillUpload, stripOrphanPlaceholders } from '../../src/renderer/src/editor/uploadDoc'
import { doc, para } from './helpers'

const placeholder = (uploadId: string) => ({ type: 'image', attrs: { file: null, width: null, uploadId } })
const d = doc(para('a'), placeholder('U1'), placeholder('U2'), { type: 'image', attrs: { file: 'ok.png', width: null } })

describe('fillUpload', () => {
  it('sets the file on the matching placeholder and clears uploadId', () => {
    const out = fillUpload(d, 'U1', 'x.png')
    expect(out.content![1].attrs).toEqual({ file: 'x.png', width: null, uploadId: null })
    expect(out.content![2]).toEqual(placeholder('U2'))
  })

  it('removes the placeholder when the upload failed', () => {
    const out = fillUpload(d, 'U2', null)
    expect(out.content!.map((n) => n.attrs?.uploadId ?? n.attrs?.file ?? n.type)).toEqual(['paragraph', 'U1', 'ok.png'])
  })
})

describe('stripOrphanPlaceholders', () => {
  it('keeps pending placeholders and drops the rest', () => {
    const out = stripOrphanPlaceholders(d, new Set(['U2']))
    expect(out.content!.map((n) => n.attrs?.uploadId ?? n.attrs?.file ?? n.type)).toEqual(['paragraph', 'U2', 'ok.png'])
  })

  it('returns the same object when nothing changes', () => {
    const clean = doc(para('a'))
    expect(stripOrphanPlaceholders(clean, new Set())).toBe(clean)
  })
})
