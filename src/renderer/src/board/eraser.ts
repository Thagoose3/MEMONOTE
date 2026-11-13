import type { BoardNode, StrokeNode } from '@shared/types'
import { PEN_PX } from './strokePath'

type P = [number, number]

function distPointSeg(p: P, a: P, b: P): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function segsIntersect(a: P, b: P, c: P, d: P): boolean {
  const cross = (o: P, p: P, q: P) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

function segDist(a: P, b: P, c: P, d: P): number {
  if (segsIntersect(a, b, c, d)) return 0
  return Math.min(distPointSeg(a, c, d), distPointSeg(b, c, d), distPointSeg(c, a, b), distPointSeg(d, a, b))
}

/** Ids of strokes the eraser path (flow coordinates) passes within `radius` of. Never returns non-strokes. */
export function strokesHitBy(eraserPath: P[], nodes: readonly (StrokeNode | BoardNode)[], radius = 8): string[] {
  if (!eraserPath.length) return []
  const path: P[] = eraserPath.length === 1 ? [eraserPath[0], eraserPath[0]] : eraserPath
  const hit: string[] = []
  for (const n of nodes) {
    if (n.kind !== 'stroke') continue
    const pts: P[] = n.points.map(([x, y]) => [n.x + x, n.y + y])
    const segs: P[] = pts.length === 1 ? [pts[0], pts[0]] : pts
    const reach = radius + PEN_PX[n.size] / 2
    let found = false
    for (let i = 0; i < path.length - 1 && !found; i++) {
      for (let j = 0; j < segs.length - 1 && !found; j++) {
        if (segDist(path[i], path[i + 1], segs[j], segs[j + 1]) <= reach) found = true
      }
    }
    if (found) hit.push(n.id)
  }
  return hit
}
