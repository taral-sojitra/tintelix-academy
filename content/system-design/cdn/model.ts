import type { Model } from "@tintelix/schema";

/** Round trips for one page: TCP handshake, TLS 1.3 handshake, the page, then its files. */
const TRIPS = 4;
/** A round trip to an edge in the same city, last mile included. Same-metro trips are single-digit ms; a Mumbai region to Cloudflare's Mumbai PoP is 10.9 ms p50 (Prisma, 2024). */
const EDGE_RTT_MS = 10;
/** Time for the origin to build a page. */
const ORIGIN_SERVE_MS = 20;
/** Time for the edge to send a page it holds. */
const EDGE_SERVE_MS = 2;
/** A purge reaches every edge in about 300 ms on Vercel; rounded up to a second. */
const PURGE_SEC = 1;

/**
 * Round trip in ms over `km` of fibre, routes included. Fitted so Mumbai to N. Virginia
 * (about 13,000 km) gives the measured ap-south-1 ↔ us-east-1 round trip of about 193 ms.
 */
const rttMs = (km: number) => 2 + 0.0146 * km;

export const cdnModel: Model = {
  defaults: { traffic: 6000, pages: 2000, originKm: 13000, edge: 0, ttlSec: 3600, purge: 0, filled: 1, oldPrice: 999, newPrice: 799 },
  run(inputs) {
    const traffic = inputs.traffic ?? 6000;
    const pages = inputs.pages ?? 2000;
    const originKm = inputs.originKm ?? 13000;
    const edge = (inputs.edge ?? 0) >= 0.5;
    const ttlSec = inputs.ttlSec ?? 3600;
    const purge = (inputs.purge ?? 0) >= 0.5;
    const filled = Math.max(0, Math.min(1, inputs.filled ?? 1));

    const rttOriginMs = rttMs(originKm);
    const rttEdgeMs = EDGE_RTT_MS;
    const noEdgePageMs = TRIPS * rttOriginMs + ORIGIN_SERVE_MS;
    const hitPageMs = TRIPS * rttEdgeMs + EDGE_SERVE_MS;
    // The edge keeps a warm connection to the origin, so a miss adds one ocean round trip.
    const missPageMs = TRIPS * rttEdgeMs + rttOriginMs + ORIGIN_SERVE_MS;

    // Each page is asked for perPageRate times a second; with a TTL of T, the edge fetches it once
    // per T and serves the other perPageRate × T requests itself.
    const perPageRate = traffic / pages;
    const lt = perPageRate * ttlSec;
    const hit = edge ? filled * (lt / (1 + lt)) : 0;

    const pageMs = !edge ? noEdgePageMs : hit >= 0.5 ? hitPageMs : missPageMs;
    const p95 = !edge ? noEdgePageMs : 1 - hit > 0.05 ? missPageMs : hitPageMs;

    return {
      trips: TRIPS,
      traffic,
      pages,
      originKm,
      ttlSec,
      oldPrice: inputs.oldPrice ?? 999,
      newPrice: inputs.newPrice ?? 799,
      rttOriginMs,
      rttEdgeMs,
      noEdgePageMs,
      hitPageMs,
      missPageMs,
      perPageRate,
      edgeHitPct: hit * 100,
      originReqs: edge ? traffic * (1 - hit) : traffic,
      pageMs,
      p95,
      staleSec: purge ? PURGE_SEC : ttlSec,
    };
  },
};
