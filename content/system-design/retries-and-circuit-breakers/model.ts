import type { Model } from "@tintelix/schema";

/**
 * Vintelix System Design 101, Chapter 76. Budget (§76.1): a 1,000 ms client budget, a gateway timeout
 * of 800 ms, and an order service that spends 50 ms itself and calls pricing and tax with 400 ms and
 * 250 ms timeouts: 700 ms used, 100 ms to spare. Storm (§76.3): pricing, sized for 500 requests a second
 * at 40 ms with a 50-connection pool, slows to 400 ms, so it can finish only 50 ÷ 0.4 = 125 a second; the
 * caller's 300 ms timeout abandons every call and retries at once, offering 500 × 3 attempts. Jitter
 * (§76.2): spreading each wave of retries over the backoff window cuts its peak. Breaker (§76.4): after
 * `tripSec` of failures it opens for `openSec`, failing calls instantly and sending pricing nothing;
 * pricing recovers, the half-open test calls succeed, and it closes. Modes: 0 budget, 1 storm,
 * 2 storm with jittered backoff, 3 breaker. `elapsedSec` is time since the step began.
 */
export const retryModel: Model = {
  defaults: {
    budgetMs: 1000, gatewayTimeoutMs: 800, orderWorkMs: 50, pricingTimeoutMs: 400, taxTimeoutMs: 250,
    rps: 500, normalMs: 40, slowMs: 400, pool: 50, timeoutMs: 300, attempts: 3, backoffBaseMs: 100,
    tripSec: 2, openSec: 10, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const budgetMs = Math.max(0, i.budgetMs ?? 1000);
    const gatewayTimeoutMs = Math.max(0, i.gatewayTimeoutMs ?? 800);
    const orderWorkMs = Math.max(0, i.orderWorkMs ?? 50);
    const pricingTimeoutMs = Math.max(0, i.pricingTimeoutMs ?? 400);
    const taxTimeoutMs = Math.max(0, i.taxTimeoutMs ?? 250);
    const rps = Math.max(0, i.rps ?? 500);
    const normalMs = Math.max(1, i.normalMs ?? 40);
    const slowMs = Math.max(1, i.slowMs ?? 400);
    const pool = Math.max(1, i.pool ?? 50);
    const timeoutMs = Math.max(1, i.timeoutMs ?? 300);
    const attempts = Math.max(1, Math.round(i.attempts ?? 3));
    const backoffBaseMs = Math.max(1, i.backoffBaseMs ?? 100);
    const tripSec = Math.max(0, i.tripSec ?? 2);
    const openSec = Math.max(0, i.openSec ?? 10);
    const mode = Math.max(0, Math.min(3, Math.round(i.mode ?? 0)));
    const t = Math.max(0, i.elapsedSec ?? 600);

    const orderUsedMs = orderWorkMs + pricingTimeoutMs + taxTimeoutMs;
    // Breaker: 0 closed (storm), 1 open, 2 closed again (recovered).
    const breaker = mode === 3 ? (t < tripSec ? 0 : t < tripSec + openSec ? 1 : 2) : 0;
    const storming = (mode === 1 || mode === 2 || (mode === 3 && breaker === 0)) && slowMs > timeoutMs;
    const healthy = mode === 0 || breaker === 2;
    const backoffMs = backoffBaseMs * 2 ** (attempts - 1);
    return {
      budgetMs,
      gatewayTimeoutMs,
      orderWorkMs,
      pricingTimeoutMs,
      taxTimeoutMs,
      rps,
      normalMs,
      slowMs,
      pool,
      timeoutMs,
      attempts,
      tripSec,
      openSec,
      mode,
      elapsedSec: t,
      orderUsedMs,
      marginMs: gatewayTimeoutMs - orderUsedMs,
      inFlightNeeded: (rps * slowMs) / 1000,
      slowCapacity: pool / (slowMs / 1000),
      offered: breaker === 1 ? 0 : storming ? rps * attempts : rps,
      successPct: healthy ? 100 : 0,
      userWaitMs: breaker === 1 ? 0 : healthy ? normalMs : attempts * timeoutMs,
      wavePeak: mode === 2 ? (rps * backoffBaseMs) / backoffMs : rps,
      backoffMs,
      breaker,
    };
  },
};
