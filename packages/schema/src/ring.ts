/** A hash ring for consistent hashing, shared by the lesson's model and its stage. */
/** A fixed, well-mixed hash to [0, 1), so the ring looks the same every time. */
export function unit(a: number): number {
  let x = (a + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Where server s's j-th virtual node sits on the ring. */
export const pointOf = (s: number, j: number) => unit(s * 7919 + j * 104729 + 17);
/** Where key k sits on the ring. */
export const keyAt = (k: number) => unit(k * 2654435761 + 3);

export interface RingPoint {
  pos: number;
  server: number;
}

export function ringPoints(servers: number, vnodes: number): RingPoint[] {
  const pts: RingPoint[] = [];
  for (let s = 0; s < servers; s++) for (let j = 0; j < vnodes; j++) pts.push({ pos: pointOf(s, j), server: s });
  return pts.sort((a, b) => a.pos - b.pos);
}

/** The server owning a position: the first point at or after it, clockwise, wrapping round. */
export function ownerOf(pos: number, pts: RingPoint[]): number {
  for (const p of pts) if (p.pos >= pos) return p.server;
  return pts[0]?.server ?? 0;
}

/** Each server's share of the ring: the arcs ending at its points. */
export function shares(servers: number, vnodes: number): number[] {
  const pts = ringPoints(servers, vnodes);
  const out = Array.from({ length: servers }, () => 0);
  pts.forEach((p, i) => {
    const prev = i === 0 ? pts[pts.length - 1]!.pos - 1 : pts[i - 1]!.pos;
    out[p.server] = (out[p.server] ?? 0) + (p.pos - prev);
  });
  return out;
}
