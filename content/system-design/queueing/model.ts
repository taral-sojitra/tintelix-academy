import type { Model } from "@tintelix/schema";

/**
 * Requests arrive at random and each takes a random amount of work; `workers` take them from one
 * shared line (an M/M/c queue). With one worker, the wait is S · ρ / (1 − ρ) and the response time
 * S / (1 − ρ): 2×, 5×, 10× and 20× the work at 50%, 80%, 90% and 95% busy (Vintelix System Design
 * 101, §4.6 and §5.2). With more workers the chance of waiting is Erlang's C formula. Requests
 * inside follow Little's law, L = λW (§5.1).
 */
const MAX_BUSY = 0.995;

/** Erlang C: the chance an arriving request has to wait, for `c` workers and an offered load of `a` busy workers. */
export function erlangC(c: number, a: number): number {
  let term = 1;
  let sum = 0;
  for (let k = 0; k < c; k++) {
    sum += term;
    term *= a / (k + 1);
  }
  // term is now a^c / c!.
  const last = (term * c) / (c - a);
  return last / (sum + last);
}

/** Response time ÷ work time for one worker at busyness ρ. */
const slowdownAt = (rho: number) => 1 / (1 - rho);

export const queueModel: Model = {
  defaults: { traffic: 50, serviceMs: 10, workers: 1 },
  run(inputs) {
    const serviceMs = Math.max(0.001, inputs.serviceMs ?? 10);
    const workers = Math.max(1, Math.round(inputs.workers ?? 1));
    const capacity = (workers * 1000) / serviceMs;
    // Past full capacity the line grows without end; hold the load just under it.
    const traffic = Math.max(0, Math.min(inputs.traffic ?? 50, capacity * MAX_BUSY));
    const a = (traffic * serviceMs) / 1000;
    const waitChance = traffic > 0 ? erlangC(workers, a) : 0;
    const waitMs = traffic > 0 ? (waitChance * serviceMs) / (workers - a) : 0;
    const responseMs = waitMs + serviceMs;
    const utilPct = (100 * a) / workers;
    return {
      traffic,
      serviceMs,
      workers,
      capacity,
      utilPct,
      sparePct: 100 - utilPct,
      waitChancePct: 100 * waitChance,
      waitMs,
      responseMs,
      slowdown: responseMs / serviceMs,
      inSystem: (traffic * responseMs) / 1000,
      inLine: (traffic * waitMs) / 1000,
      slowdownAt50: slowdownAt(0.5),
      slowdownAt80: slowdownAt(0.8),
      slowdownAt90: slowdownAt(0.9),
      slowdownAt95: slowdownAt(0.95),
    };
  },
};
