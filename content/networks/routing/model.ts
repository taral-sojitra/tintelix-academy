import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Round trips in ms to each hop: R1 and R2 on every route, then the route's own routers and server. */
const COMMON = [1, 8];
const ROUTES = [
  { prefix: 0, hops: [22, 118, 121] },
  { prefix: 24, hops: [31, 33] },
  { prefix: 25, hops: [26, 27] },
];

/**
 * Routing. R2 holds three routes: 0.0.0.0/0 via R3, 198.51.100.0/24 via R4 and 198.51.100.128/25 via R5.
 * The destination is 198.51.100.`destD`, or 203.0.113.9 in the default-route mode (3); the longest
 * matching prefix picks the next hop. Each route's hop times are what traceroute reports. Modes: 0 the
 * problem, 1 the table, 2 hop by hop, 3 the default route, 4 traceroute.
 */
export const routingModel: Model = {
  defaults: { destD: 200, mode: 0 },
  run(i) {
    const destD = Math.min(254, Math.max(1, Math.round(fin(i.destD, 200))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const outside = mode === 3;
    const routeIdx = outside ? 0 : destD >= 128 ? 2 : 1;
    const path = [...COMMON, ...ROUTES[routeIdx]!.hops];
    const out: Record<string, number> = {
      mode,
      destD,
      destOutside: outside ? 1 : 0,
      routeIdx,
      matchCount: outside ? 1 : routeIdx === 2 ? 3 : 2,
      chosenPrefix: ROUTES[routeIdx]!.prefix,
      toR3Pct: routeIdx === 0 ? 100 : 0,
      toR4Pct: routeIdx === 1 ? 100 : 0,
      toR5Pct: routeIdx === 2 ? 100 : 0,
      traceHops: path.length,
      totalMs: path[path.length - 1]!,
    };
    for (let n = 0; n < 5; n++) out[`trace${n + 1}Ms`] = path[n] ?? 0;
    return out;
  },
};
