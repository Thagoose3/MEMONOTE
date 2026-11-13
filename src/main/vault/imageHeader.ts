/** Width/height from GIF or WebP headers (formats Electron's nativeImage cannot decode). */
export function headerSize(b: Uint8Array): { width: number; height: number } | null {
  const ascii = (from: number, len: number): string => String.fromCharCode(...b.subarray(from, from + len))
  const u16 = (i: number): number => b[i] | (b[i + 1] << 8)
  const u24 = (i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)

  if (b.length >= 10 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) {
    return { width: u16(6), height: u16(8) }
  }
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
      return { width: u16(26) & 0x3fff, height: u16(28) & 0x3fff }
    }
    if (chunk === 'VP8L' && b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return { width: u24(24) + 1, height: u24(27) + 1 }
    }
  }
  return null
}
