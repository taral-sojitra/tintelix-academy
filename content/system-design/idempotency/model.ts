import type { Model } from "@tintelix/schema";

/**
 * Payments with retries. `timeoutPct` of calls time out; for `completedPct` of those the charge went
 * through and only the reply was lost, so a plain retry charges again. Separately, `dupPct` of payments
 * arrive twice at once (a double tap, two retries racing). An idempotency key stored with the result
 * lets a retry get the first result back (mode 1); if the server checks and then inserts, two
 * simultaneous requests can both miss, so the key must be claimed atomically first (mode 2), e.g. with
 * a unique insert. Keys are kept `keyTtlHours`. Rates and sizes are this lesson's own example.
 */
export const idemModel: Model = {
  defaults: { payments: 1000, timeoutPct: 1, completedPct: 50, dupPct: 0.1, keyTtlHours: 24, keyBytes: 200, mode: 0 },
  run(i) {
    const payments = Math.max(0, i.payments ?? 1000);
    const timeout = Math.max(0, Math.min(100, i.timeoutPct ?? 1)) / 100;
    const completed = Math.max(0, Math.min(100, i.completedPct ?? 50)) / 100;
    const dup = Math.max(0, Math.min(100, i.dupPct ?? 0.1)) / 100;
    const keyTtlHours = Math.max(0, i.keyTtlHours ?? 24);
    const keyBytes = Math.max(1, i.keyBytes ?? 200);
    const mode = Math.max(0, Math.min(2, Math.round(i.mode ?? 0)));

    const retries = payments * timeout;
    const retryDoubles = mode === 0 ? retries * completed : 0;
    const raceDoubles = mode < 2 ? payments * dup : 0;
    const doubles = retryDoubles + raceDoubles;
    const keysStored = mode >= 1 ? payments * keyTtlHours * 3600 : 0;
    return {
      payments,
      timeoutPct: timeout * 100,
      completedPct: completed * 100,
      dupPct: dup * 100,
      keyTtlHours,
      mode,
      retries,
      retryDoubles,
      raceDoubles,
      doubles,
      doublesPerDay: doubles * 86400,
      keysStored,
      keyGb: (keysStored * keyBytes) / 1e9,
    };
  },
};
