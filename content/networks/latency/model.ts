import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Light covers about 200 km a millisecond in glass fibre, and 300 in a vacuum. */
const FIBRE_KM_PER_MS = 200;
const VACUUM_KM_PER_MS = 300;
/** Each router adds about 0.1 ms each way to read and forward a packet. */
const HOP_MS = 0.1;
/** Round trips before the first byte (DNS, TCP, TLS, the request), and for the rest of the page. */
const ROUNDS_FIRST = 4;
const ROUNDS_PAGE = 6;
/** A CDN edge server: 50 km away, 4 hops. */
const EDGE_KM = 50;
const EDGE_HOPS = 4;

/**
 * Latency. A round trip is distance (there and back at fibre speed), router hops, and time waiting in
 * queues (`queueMs`, both ways together). A page load pays it 4 times before the first byte and 6 in all.
 * Modes: 0 the question, 1 distance, 2 hops and queues, 3 round trips, 4 cutting it.
 */
export const latencyModel: Model = {
  defaults: { distanceKm: 7000, queueMs: 10, hops: 14, mode: 0 },
  run(i) {
    const distanceKm = Math.min(20_000, Math.max(10, fin(i.distanceKm, 7000)));
    const queueMs = Math.min(1000, Math.max(0, fin(i.queueMs, 10)));
    const hops = Math.min(64, Math.max(1, Math.round(fin(i.hops, 14))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const oneWayMs = distanceKm / FIBRE_KM_PER_MS;
    const propRttMs = 2 * oneWayMs;
    const hopMs = 2 * hops * HOP_MS;
    const rttMs = propRttMs + hopMs + queueMs;
    const edgeRttMs = (2 * EDGE_KM) / FIBRE_KM_PER_MS + 2 * EDGE_HOPS * HOP_MS + queueMs;
    return {
      mode,
      distanceKm,
      queueMs,
      hops,
      oneWayMs,
      vacuumOneWayMs: distanceKm / VACUUM_KM_PER_MS,
      propRttMs,
      hopMs,
      rttMs,
      propPct: (propRttMs / rttMs) * 100,
      roundsFirst: ROUNDS_FIRST,
      roundsPage: ROUNDS_PAGE,
      firstByteMs: ROUNDS_FIRST * rttMs,
      pageMs: ROUNDS_PAGE * rttMs,
      edgeKm: EDGE_KM,
      edgeRttMs,
      edgePageMs: ROUNDS_PAGE * edgeRttMs,
    };
  },
};
