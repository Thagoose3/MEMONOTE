import { getStroke } from 'perfect-freehand'
import type { PenSize, StrokePoint } from '@shared/types'

export const PEN_COLORS = ['#1f1f1f', '#8a8f98', '#d6409f', '#3b5bdb', '#1c9bef', '#f08c00', '#2f9e44', '#e03131']
export const PEN_PX: Record<PenSize, number> = { S: 4, M: 8, L: 14 }

/** Move a stroke's origin to its bounding-box minimum; points become relative. */
export function normalizeStroke(points: StrokePoint[]): { x: number; y: number; points: StrokePoint[] } {
  const x = Math.min(...points.map((p) => p[0]))
  const y = Math.min(...points.map((p) => p[1]))
  return { x, y, points: points.map(([px, py, pr]) => [px - x, py - y, pr]) }
}

function average(a: number, b: number): number {
  return (a + b) / 2
}

/** perfect-freehand outline -> SVG path (quadratic smoothing between outline points). */
export function strokeToPath(points: StrokePoint[], size: PenSize, fromPen: boolean): string {
  const outline = getStroke(points, {
    size: PEN_PX[size],
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !fromPen,
    last: true
  })
  if (!outline.length) return ''
  const len = outline.length
  let d = `M${outline[0][0].toFixed(2)},${outline[0][1].toFixed(2)} Q`
  for (let i = 0; i < len; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % len]
    d += `${x0.toFixed(2)},${y0.toFixed(2)} ${average(x0, x1).toFixed(2)},${average(y0, y1).toFixed(2)} `
  }
  return d + 'Z'
}
