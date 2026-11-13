import { describe, it, expect } from 'vitest'
import { rewriteRemoteImages } from '../../src/renderer/src/editor/ext/pasteHtml'

describe('rewriteRemoteImages', () => {
  it('rewrites https img to a remote-image placeholder', () => {
    const out = rewriteRemoteImages('<p>ก่อน<img src="https://ex.com/a.png" alt="x">หลัง</p>')
    expect(out).toBe('<p>ก่อน<span data-remote-image="https://ex.com/a.png"></span>หลัง</p>')
  })

  it('handles single quotes, http and unquoted-free attribute order', () => {
    const out = rewriteRemoteImages("<img class='c' src='http://ex.com/b.jpg?x=1&amp;y=2'>")
    expect(out).toBe('<span data-remote-image="http://ex.com/b.jpg?x=1&amp;y=2"></span>')
  })

  it('keeps data: images and text untouched', () => {
    const html = '<p>text</p><img src="data:image/png;base64,AAAA">'
    expect(rewriteRemoteImages(html)).toBe(html)
  })

  it('drops img with no usable src', () => {
    expect(rewriteRemoteImages('<img alt="x">ok')).toBe('ok')
  })
})
