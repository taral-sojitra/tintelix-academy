import type { Model } from "@tintelix/schema";

/**
 * A flash sale sends `spikeRps` jobs a second for `spikeSec` (from `spikeAt`) to workers that handle
 * `workers` × `perWorker` a second (Vintelix System Design 101, Chapter 29). Called directly, the
 * excess fails. Through a queue everything is accepted: the backlog grows by the excess during the
 * spike and drains at capacity − normal traffic afterwards, and the longest wait is backlog ÷ capacity.
 * Poison messages (`poisonPct`, failing every time) retried without limit pile up, each retried about
 * once a second, until they use every worker; with a dead-letter queue (§64.6) each costs only
 * `attempts` tries and then waits for a person. Modes: 0 direct, 1 queue, 2 queue with endless
 * retries, 3 queue with a dead-letter queue. `elapsedSec` is time since the step began. Numbers are
 * this lesson's own example.
 */
export const mqModel: Model = {
  defaults: { baseRps: 200, spikeRps: 2000, spikeAt: 2, spikeSec: 30, workers: 4, perWorker: 125, mode: 0, poisonPct: 1, attempts: 3, horizonSec: 120, elapsedSec: 600 },
  run(i) {
    const baseRps = Math.max(0, i.baseRps ?? 200);
    const spikeRps = Math.max(baseRps, i.spikeRps ?? 2000);
    const spikeAt = Math.max(0, i.spikeAt ?? 2);
    const spikeSec = Math.max(0, i.spikeSec ?? 30);
    const workers = Math.max(1, Math.round(i.workers ?? 4));
    const perWorker = Math.max(1, i.perWorker ?? 125);
    const mode = Math.max(0, Math.min(3, Math.round(i.mode ?? 0)));
    const poisonPct = Math.max(0, Math.min(100, i.poisonPct ?? 1));
    const attempts = Math.max(1, Math.round(i.attempts ?? 3));
    const horizonSec = Math.max(0, i.horizonSec ?? 120);
    const t = Math.max(0, i.elapsedSec ?? 600);

    const capacity = workers * perWorker;
    const spikeEnd = spikeAt + spikeSec;
    const inSpike = t >= spikeAt && t < spikeEnd;
    const arrival = inSpike ? spikeRps : baseRps;
    const excess = Math.max(0, spikeRps - capacity);
    const peakBacklog = excess * spikeSec;
    const drainRate = capacity - baseRps;
    const queued = mode >= 1;
    let backlog = 0;
    if (queued && t >= spikeAt) backlog = t < spikeEnd ? excess * (t - spikeAt) : drainRate > 0 ? Math.max(0, peakBacklog - drainRate * (t - spikeEnd)) : peakBacklog;
    const poisonRps = (baseRps * poisonPct) / 100;
    const wasteAt = (sec: number) => (mode === 3 ? (100 * poisonRps * attempts) / capacity : Math.min(100, (100 * poisonRps * sec) / capacity));
    return {
      baseRps,
      spikeRps,
      spikeSec,
      workers,
      capacity,
      mode,
      attempts,
      horizonSec,
      elapsedSec: t,
      arrival,
      inSpike: inSpike ? 1 : 0,
      failingPct: queued ? 0 : 100 * Math.max(0, 1 - capacity / arrival),
      failedTotal: queued ? 0 : excess * spikeSec,
      peakBacklog: queued ? peakBacklog : 0,
      backlog,
      waitSec: backlog / capacity,
      maxWaitSec: peakBacklog / capacity,
      drainSec: drainRate > 0 ? peakBacklog / drainRate : 1e9,
      poisonRps,
      poisonPct,
      circulating: mode === 3 ? poisonRps * attempts : mode === 2 ? poisonRps * t : 0,
      wastedPct: mode >= 2 ? wasteAt(t) : 0,
      wastedAtHorizonPct: wasteAt(horizonSec),
      dlq: mode === 3 ? poisonRps * Math.max(0, t - attempts) : 0,
      dlqAtHorizon: poisonRps * horizonSec,
    };
  },
};
