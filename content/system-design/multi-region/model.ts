import type { Model } from "@tintelix/schema";

/** Scene second at which Mumbai goes dark (failover steps) or the write lands (lag step). */
export const EVENT_AT_SEC = 1;

/**
 * Vintelix System Design 101, Chapter 97. Two regions, Mumbai and N. Virginia, about 193 ms apart (the
 * measured ap-south-1 ↔ us-east-1 round trip, as in the CDN lesson); 10 ms to a region in your own city.
 * Async replication shows a write in the other region after half a round trip plus the apply batch
 * (§97.3: 50–100 ms; 75 here). Active-passive (§97.2): Mumbai serves everyone and Virginia stands by.
 * Failover (§97.6): 3 failed checks 10 s apart to notice, then promoting the standby (60 s, this lesson's
 * assumption), then clients move over as their cached DNS answers expire (spread evenly over the TTL).
 * Active-active: each region serves its own users and takes writes; when Mumbai dies there's nothing to
 * promote, and its users move once noticed. Writes not yet copied when a region dies are lost (rate ×
 * lag). Modes: 0 active-passive, 1 its failover, 2 active-active, 3 its failover, 4 the lag, slowed down.
 * Failover timelines run `speedup` times real speed; the lag step runs that many times slower.
 */
export const regionModel: Model = {
  defaults: {
    nearRttMs: 10, farRttMs: 193, applyMs: 75, writeRate: 2000, checks: 3, checkIntervalSec: 10,
    promoteSec: 60, dnsTtlSec: 60, speedup: 10, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const nearRttMs = Math.max(0, i.nearRttMs ?? 10);
    const farRttMs = Math.max(0, i.farRttMs ?? 193);
    const applyMs = Math.max(0, i.applyMs ?? 75);
    const writeRate = Math.max(0, i.writeRate ?? 2000);
    const checks = Math.max(1, Math.round(i.checks ?? 3));
    const checkIntervalSec = Math.max(0, i.checkIntervalSec ?? 10);
    const promoteSec = Math.max(0, i.promoteSec ?? 60);
    const dnsTtlSec = Math.max(1, i.dnsTtlSec ?? 60);
    const speedup = Math.max(1, i.speedup ?? 10);
    const mode = Math.round(i.mode ?? 0);
    const t = Math.max(0, i.elapsedSec ?? 600);

    const activeActive = mode >= 2;
    const lagMs = farRttMs / 2 + applyMs;
    const detectSec = checks * checkIntervalSec;
    const failover = mode === 1 || mode === 3;
    const realSec = failover ? Math.max(0, (t - EVENT_AT_SEC) * speedup) : 0;
    const down = failover && t >= EVENT_AT_SEC;
    // When routing starts sending the dead region's users to Virginia: after promotion (active-passive)
    // or as soon as the outage is noticed (active-active).
    const moveFrom = mode === 1 ? detectSec + promoteSec : detectSec;
    const movedPct = down ? 100 * Math.min(1, Math.max(0, (realSec - moveFrom) / dnsTtlSec)) : 0;

    let phase = 0;
    if (down && mode === 1) phase = realSec < detectSec ? 1 : realSec < moveFrom ? 2 : realSec < moveFrom + dnsTtlSec ? 3 : 4;
    if (down && mode === 3) phase = realSec < detectSec ? 1 : realSec < moveFrom + dnsTtlSec ? 2 : 3;
    const done = (mode === 1 && phase === 4) || (mode === 3 && phase === 3);

    // Share of all requests: active-passive sends everyone to one region; active-active, half to each.
    const failedShare = mode === 1 && down ? 1 - movedPct / 100 : mode === 3 && down ? 0.5 * (1 - movedPct / 100) : 0;
    const writeLagSec = (lagMs * speedup) / 1000;
    const wrote = mode === 4 && t >= EVENT_AT_SEC;
    const copied = mode === 4 && t >= EVENT_AT_SEC + writeLagSec;

    return {
      nearRttMs, farRttMs, applyMs, writeRate, checks, checkIntervalSec, promoteSec, dnsTtlSec, speedup,
      mode, elapsedSec: t, lagMs, detectSec, realSec, phase, movedPct,
      regionRate: activeActive ? writeRate / 2 : writeRate,
      standbyServesPct: activeActive ? 100 : 0,
      mumbaiUp: down ? 0 : 1,
      primary: mode === 1 && down && realSec >= moveFrom ? 1 : 0,
      indiaRttMs: done ? farRttMs : nearRttMs,
      usRttMs: activeActive || done ? nearRttMs : farRttMs,
      writesDowntime: detectSec + promoteSec,
      cutoverDowntime: detectSec + promoteSec + dnsTtlSec,
      indiaDowntime: detectSec + dnsTtlSec,
      usDowntime: 0,
      lostWrites: ((activeActive ? writeRate / 2 : writeRate) * lagMs) / 1000,
      failedPct: 100 * failedShare,
      acceptedRate: writeRate * (1 - failedShare),
      mumbaiV: wrote ? 2 : 1,
      virginiaV: copied ? 2 : 1,
      staleRead: wrote && !copied ? 1 : 0,
    };
  },
};
