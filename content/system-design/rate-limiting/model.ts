import type { Model } from "@tintelix/schema";

/**
 * An API that can serve `capacity` requests a second, shared by `normalClients` well-behaved clients
 * and one client flooding it. Without a limit, everyone gets capacity ÷ demand of their requests
 * through. A token bucket per client (refilled at `limit` a second, holding at most `bucket`) holds the
 * flooder to its rate and answers the rest with 429, yet lets a burst of up to `bucket` through at
 * once, where a strict per-second window would cut it at `limit`. If each of `servers` servers keeps
 * its own bucket, a client gets `servers` times the limit; a shared counter fixes that. Modes: 0 none,
 * 1 shared bucket, 2 a bucket on each server. Numbers are this lesson's own example.
 */
export const limitModel: Model = {
  defaults: { capacity: 1000, normalClients: 100, normalRate: 5, flooderRate: 2000, limit: 10, bucket: 50, burst: 30, servers: 4, mode: 0 },
  run(i) {
    const capacity = Math.max(1, i.capacity ?? 1000);
    const normalClients = Math.max(0, i.normalClients ?? 100);
    const normalRate = Math.max(0, i.normalRate ?? 5);
    const flooderRate = Math.max(0, i.flooderRate ?? 2000);
    const limit = Math.max(1, i.limit ?? 10);
    const bucket = Math.max(1, i.bucket ?? 50);
    const burst = Math.max(0, i.burst ?? 30);
    const servers = Math.max(1, Math.round(i.servers ?? 4));
    const mode = Math.max(0, Math.min(2, Math.round(i.mode ?? 0)));

    const normalRps = normalClients * normalRate;
    const flooderAllowed = mode === 0 ? flooderRate : Math.min(flooderRate, limit * (mode === 2 ? servers : 1));
    const total = normalRps + flooderAllowed;
    return {
      capacity,
      normalClients,
      normalRate,
      normalRps,
      flooderRate,
      limit,
      bucket,
      burst,
      servers,
      mode,
      offered: normalRps + flooderRate,
      flooderAllowed,
      refusedRps: flooderRate - flooderAllowed,
      successPct: 100 * Math.min(1, capacity / Math.max(1, total)),
      loadPct: (100 * total) / capacity,
      burstAllowed: Math.min(burst, bucket),
      windowAllowed: Math.min(burst, limit),
      refillSec: bucket / limit,
      sharedAllowed: Math.min(flooderRate, limit),
    };
  },
};
