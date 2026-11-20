import type { Model } from "@tintelix/schema";

/**
 * Latency of one call, as a fast path and a slow path. The figures are the teaching example in
 * Vintelix System Design 101, §4.2: hits at 2 ms, misses at 200 ms, 95% hits, mean 11.9 ms.
 * A page makes `calls` calls at once and waits for the slowest (§4.3, §4.7; Dean and Barroso,
 * "The Tail at Scale", CACM, February 2013). With `hedge` on, a call still running after `hedgeMs`
 * gets a copy on another server and the first answer wins (Dean and Barroso's hedged requests);
 * the copy is slow with the same chance, independently.
 */
const TOLERANCE = 1e-9;

/** The smallest value v with P(latency ≤ v) ≥ q (nearest rank). `cdf` lists [value, P(≤ value)] in rising order. */
function percentile(cdf: [number, number][], q: number): number {
  for (const [v, p] of cdf) if (p >= q - TOLERANCE) return v;
  return cdf[cdf.length - 1]![0];
}

export const latencyModel: Model = {
  defaults: { fastMs: 2, slowMs: 200, slowPct: 5, perDay: 1000000, calls: 1, hedge: 0, hedgeMs: 10 },
  run(inputs) {
    const fastMs = inputs.fastMs ?? 2;
    const slowMs = inputs.slowMs ?? 200;
    const slowPct = Math.max(0, Math.min(100, inputs.slowPct ?? 5));
    const perDay = inputs.perDay ?? 1000000;
    const calls = Math.max(1, Math.round(inputs.calls ?? 1));
    const hedge = (inputs.hedge ?? 0) >= 0.5;
    const hedgeMs = inputs.hedgeMs ?? 10;
    const s = slowPct / 100;

    // A copy only beats the slow path if it is sent and answers before the slow call would.
    const helps = hedge && hedgeMs + fastMs < slowMs;
    const hedgeReplyMs = helps ? hedgeMs + fastMs : slowMs;
    /** Chance one call ends on the slow path. */
    const q = helps ? s * s : s;

    // One call: fast, a hedged reply, or slow.
    const callFast = 1 - s;
    const callMid = helps ? s * (1 - s) : 0;
    const meanMs = callFast * fastMs + callMid * hedgeReplyMs + q * slowMs;

    // Without hedging (steps 1–3 never hedge).
    const plain: [number, number][] = [[fastMs, 1 - s], [slowMs, 1]];
    // A page is as slow as its slowest call: P(page ≤ v) = P(call ≤ v)^calls.
    const pageCdf: [number, number][] = [
      [fastMs, Math.pow(1 - s, calls)],
      [hedgeReplyMs, Math.pow(1 - q, calls)],
      [slowMs, 1],
    ];
    const pageFastPct = 100 * pageCdf[0]![1];
    const pageMidPct = helps ? 100 * (pageCdf[1]![1] - pageCdf[0]![1]) : 0;
    const pageSlowPct = 100 - pageFastPct - pageMidPct;
    const pageMeanMs = (pageFastPct * fastMs + pageMidPct * hedgeReplyMs + pageSlowPct * slowMs) / 100;

    const hedgedPct = !hedge ? 0 : hedgeMs < fastMs ? 100 : hedgeMs < slowMs ? slowPct : 0;

    return {
      fastMs,
      slowMs,
      slowPct,
      perDay,
      calls,
      hedgeMs,
      fastPct: 100 - slowPct,
      meanMs,
      callP50Ms: percentile(plain, 0.5),
      callP99Ms: percentile(plain, 0.99),
      pageP50Ms: percentile(pageCdf, 0.5),
      pageP99Ms: percentile(pageCdf, 0.99),
      pageMeanMs,
      pageFastPct,
      pageMidPct,
      pageSlowPct,
      hedgeReplyMs,
      hedgedPct,
      slowPerDay: perDay * s,
      tenCallsSlowPct: 100 * (1 - Math.pow(1 - s, 10)),
      hundredCallsSlowPct: 100 * (1 - Math.pow(1 - s, 100)),
    };
  },
};
