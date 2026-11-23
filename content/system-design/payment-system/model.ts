import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a payment system, with the numbers from Vintelix System Design 101, Chapter 136: 20 million payment
 * attempts a day, peaking at 3×; 97% authorized, 95% of those captured; refunds about 2% of captures; one
 * failure in 10,000 attempts turning into about 2,000 double charges a day when the charge happens before
 * anything is recorded. The lesson's own: two ledger rows for every capture and refund.
 * Modes: 0 the ask, 1 charge then record at launch, 2 timeouts and retries, 3 intent first with idempotency
 * keys, 4 authorize, capture, refund and the double-entry ledger, 5 reconciliation and provider outages.
 */
export const paymentModel: Model = {
  defaults: { attemptsPerDay: 20e6, peakFactor: 3, authPct: 97, capturePct: 95, refundPct: 2, timeoutsPer10k: 1, mode: 0 },
  run(i) {
    const attemptsPerDay = Math.max(0, fin(i.attemptsPerDay, 20e6));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const authPct = Math.min(100, Math.max(0, fin(i.authPct, 97)));
    const capturePct = Math.min(100, Math.max(0, fin(i.capturePct, 95)));
    const refundPct = Math.min(100, Math.max(0, fin(i.refundPct, 2)));
    const timeoutsPer10k = Math.max(0, fin(i.timeoutsPer10k, 1));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const avgRate = attemptsPerDay / 86_400;
    const captureRate = (avgRate * authPct * capturePct) / 10_000;
    const refundRate = (captureRate * refundPct) / 100;
    /** Charge first, record after: every attempt that times out and is retried is charged twice. */
    const dupsPerDay = (attemptsPerDay * timeoutsPer10k) / 10_000;

    return {
      attemptsPerDay, peakFactor, authPct, capturePct, refundPct, timeoutsPer10k, mode,
      attemptsM: attemptsPerDay / 1e6,
      avgRate,
      peakRate: avgRate * peakFactor,
      captureRate,
      capturePeak: captureRate * peakFactor,
      refundRate,
      dupsPerDay,
      dupsNow: mode <= 2 ? dupsPerDay : 0,
      /** Red on the board for the retried request in the timeouts step. */
      dupShownPct: mode === 2 ? 50 : 0,
      ledgerRowsM: ((captureRate + refundRate) * 86_400 * 2) / 1e6,
    };
  },
};
