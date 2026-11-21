import type { Model } from "@tintelix/schema";

/**
 * Three copies of a database: two at site A, one at site B (Vintelix System Design 101, Chapter 6).
 * When the network between the sites splits, a system that keeps consistency (CP) lets only the
 * majority side answer, so users who reach site B get errors; a system that keeps availability (AP)
 * answers everyone, but site B answers from a copy that can't see site A's writes, and the writes B
 * accepted must be reconciled when the split heals. Without a split (PACELC's "else"), a majority
 * commit waits a round trip to the nearest other copy on every write: ~2 ms in one region, ~66 ms
 * across regions (§6.5), and by Little's law that many more writes are in flight. Traffic, the share of
 * users near site B and the split's length are this lesson's own example.
 */
export const capModel: Model = {
  defaults: { requests: 30000, writesPct: 10, sideBPct: 30, partitionSec: 60, mode: 0, rttMs: 1, flushMs: 1, replicas: 3 },
  run(i) {
    const requests = Math.max(0, i.requests ?? 30000);
    const writes = Math.max(0, Math.min(100, i.writesPct ?? 10)) / 100;
    const sideB = Math.max(0, Math.min(100, i.sideBPct ?? 30)) / 100;
    const partitionSec = Math.max(0, i.partitionSec ?? 60);
    const mode = Math.max(0, Math.min(2, Math.round(i.mode ?? 0)));
    const rttMs = Math.max(0, i.rttMs ?? 1);
    const flushMs = Math.max(0, i.flushMs ?? 1);
    const replicas = Math.max(1, Math.round(i.replicas ?? 3));

    const cp = mode === 1;
    const ap = mode === 2;
    const writeRps = requests * writes;
    const commitMs = flushMs + rttMs;
    return {
      requests,
      writesPct: writes * 100,
      sideBPct: sideB * 100,
      partitionSec,
      mode,
      rttMs,
      replicas,
      majority: Math.floor(replicas / 2) + 1,
      sideBRps: requests * sideB,
      errorPct: cp ? sideB * 100 : 0,
      errorRps: cp ? requests * sideB : 0,
      stalePct: ap ? sideB * 100 : 0,
      reconcile: ap ? writeRps * sideB * partitionSec : 0,
      writeRps,
      commitMs,
      inFlight: (writeRps * commitMs) / 1000,
    };
  },
};
