import type { Model } from "@tintelix/schema";

/** p95 once fewer than 5% of reads miss: the slowest 5% are cache hits. */
const HIT_P95_MS = 25.5;

export const cachingModel: Model = {
  defaults: { traffic: 6000, hitRate: 0.92, dbCapacity: 6500 },
  run(inputs) {
    const traffic = inputs.traffic ?? 6000;
    const hitRate = inputs.hitRate ?? 0.92;
    const dbCapacity = inputs.dbCapacity ?? 6500;
    const dbReads = traffic * (1 - hitRate);
    const dbBusy = dbReads / dbCapacity;
    const p95 = 1 - hitRate < 0.05 ? HIT_P95_MS : 24 + 12 / (1 - Math.min(dbBusy, 0.95));
    return { traffic, dbCapacity, hitRatePct: hitRate * 100, dbReads, dbBusy, dbBusyPct: dbBusy * 100, p95 };
  },
};
