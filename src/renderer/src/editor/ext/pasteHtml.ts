const IMG_TAG = /<img\b[^>]*>/gi
const SRC_ATTR = /\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i

/**
 * Remote <img> tags in pasted HTML must never load by themselves. Replace each http(s) image
 * with a placeholder span that the remoteImage node turns into a "click to download" box.
 * data: images are left alone; images without a usable src are dropped.
 */
export function rewriteRemoteImages(html: string): string {
  return html.replace(IMG_TAG, (tag) => {
    const m = SRC_ATTR.exec(tag)
    const src = (m?.[2] ?? m?.[3] ?? '').trim()
    if (/^https?:\/\//i.test(src)) return `<span data-remote-image="${src.replace(/"/g, '&quot;')}"></span>`
    if (/^data:image\//i.test(src)) return tag
    return ''
  })
}
