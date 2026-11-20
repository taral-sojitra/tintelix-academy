export type Point = [number, number];

/** A cubic Bézier wire, sampled so dots can move along it at constant speed. */
export interface Wire {
  pts: Point[];
  cum: number[];
  len: number;
}

/** Control points sit at half the horizontal distance, so wires leave and enter boxes level. */
export function makeWire(from: Point, to: Point, samples = 48): Wire {
  const k = (to[0] - from[0]) * 0.5;
  const p1: Point = [from[0] + k, from[1]];
  const p2: Point = [to[0] - k, to[1]];
  const pts: Point[] = [];
  const cum = [0];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const x = mt * mt * mt * from[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * to[0];
    const y = mt * mt * mt * from[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * to[1];
    if (i > 0) {
      const prev = pts[i - 1]!;
      cum.push(cum[i - 1]! + Math.hypot(x - prev[0], y - prev[1]));
    }
    pts.push([x, y]);
  }
  return { pts, cum, len: cum[samples]! };
}

/** The point at distance `s` along the wire, shifted `offset` units to its left. */
export function posAt(w: Wire, s: number, offset = 0): Point {
  const n = w.pts.length - 1;
  const d = Math.max(0, Math.min(w.len, s));
  let i = 0;
  while (i < n - 1 && w.cum[i + 1]! < d) i++;
  const seg = w.cum[i + 1]! - w.cum[i]! || 1;
  const f = (d - w.cum[i]!) / seg;
  const a = w.pts[i]!;
  const b = w.pts[i + 1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * f - (dy / L) * offset, a[1] + dy * f + (dx / L) * offset];
}
