import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** TCP's maximum segment on Ethernet, in bytes. */
const MSS = 1460;
/** Shown as "no limit" when there's no loss at all. */
const NO_LIMIT = 100_000;

/**
 * Bandwidth and throughput. The link carries `bandwidthMbps`. One TCP connection over a path with
 * `rttMs` round trips and `lossPct` loss gets at most about (MSS / RTT) × 1.22 / √loss (the classic
 * Mathis formula for loss-based congestion control), and never more than the link. A `fileMB` download
 * takes size ÷ throughput. Filling the pipe needs bandwidth × round trip in flight. Modes: 0 the problem,
 * 1 bandwidth vs throughput, 2 filling the pipe, 3 loss, 4 what helps.
 */
export const bandwidthModel: Model = {
  defaults: { bandwidthMbps: 100, rttMs: 80, lossPct: 0.1, fileMB: 100, mode: 0 },
  run(i) {
    const bandwidthMbps = Math.min(10_000, Math.max(1, fin(i.bandwidthMbps, 100)));
    const rttMs = Math.min(1000, Math.max(1, fin(i.rttMs, 80)));
    const lossPct = Math.min(20, Math.max(0, fin(i.lossPct, 0.1)));
    const fileMB = Math.max(0.001, fin(i.fileMB, 100));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const p = lossPct / 100;
    const lossLimitMbps = p > 0 ? Math.min(NO_LIMIT, (((MSS * 8) / (rttMs / 1000)) * (1.22 / Math.sqrt(p))) / 1e6) : NO_LIMIT;
    const throughputMbps = Math.min(bandwidthMbps, lossLimitMbps);
    return {
      mode,
      bandwidthMbps,
      rttMs,
      lossPct,
      fileMB,
      lossLimitMbps,
      throughputMbps,
      utilPct: (throughputMbps / bandwidthMbps) * 100,
      idealSec: (fileMB * 8) / bandwidthMbps,
      actualSec: (fileMB * 8) / throughputMbps,
      bdpKB: (bandwidthMbps * 1e6 * (rttMs / 1000)) / 8 / 1000,
      lostShownPct: Math.min(100, lossPct * 20),
    };
  },
};
