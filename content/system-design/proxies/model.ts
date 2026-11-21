import type { Model } from "@tintelix/schema";

/**
 * Forward proxy: an office's staff all download the same file; a caching forward proxy fetches it
 * once. Reverse proxy: a backend worker is held for a request's work plus, without buffering, the
 * time the client takes to receive the response; a buffering proxy takes the response over the
 * local network in about a millisecond and feeds slow clients itself (Vintelix System Design 101,
 * §19.5: the proxy "absorbs a slow client without tying up a backend connection"). Busy workers
 * follow Little's law (§5.1). The office size, file size, traffic and client mix are this lesson's
 * own example.
 */
export const proxyModel: Model = {
  defaults: { employees: 500, updateMb: 200, rps: 400, workMs: 20, slowPct: 30, slowMs: 1000, fastMs: 20, lanMs: 1, workers: 100, buffering: 0 },
  run(i) {
    const employees = Math.max(1, Math.round(i.employees ?? 500));
    const updateMb = Math.max(0, i.updateMb ?? 200);
    const rps = Math.max(0, i.rps ?? 400);
    const workMs = Math.max(0, i.workMs ?? 20);
    const slowPct = Math.max(0, Math.min(100, i.slowPct ?? 30));
    const slowMs = Math.max(0, i.slowMs ?? 1000);
    const fastMs = Math.max(0, i.fastMs ?? 20);
    const lanMs = Math.max(0, i.lanMs ?? 1);
    const workers = Math.max(1, Math.round(i.workers ?? 100));
    const buffering = (i.buffering ?? 0) >= 0.5;
    const s = slowPct / 100;
    const clientMs = (1 - s) * fastMs + s * slowMs;
    const holdMs = workMs + (buffering ? lanMs : clientMs);
    const busyWorkers = (rps * holdMs) / 1000;
    return {
      employees,
      updateMb,
      rps,
      workMs,
      slowPct,
      slowMs,
      workers,
      lanMs,
      buffering: buffering ? 1 : 0,
      officeGb: (employees * updateMb) / 1000,
      proxyGb: updateMb / 1000,
      savedPct: 100 * (1 - 1 / employees),
      clientMs,
      holdMs,
      busyWorkers,
      workerLoadPct: (100 * busyWorkers) / workers,
      servedPct: busyWorkers > 0 ? Math.min(100, (100 * workers) / busyWorkers) : 100,
      maxRps: holdMs > 0 ? (workers * 1000) / holdMs : 0,
    };
  },
};
