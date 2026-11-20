import { caching } from "../../../../content/system-design/caching/lesson";
import { rng } from "../rng";
import { replyLatencyMs } from "./cache-aside";

/** Share of finished reads whose label is above the model's p95, simulating hits and misses at the model's hit rate. */
function shareAboveP95(inputs: Record<string, number>, seed: number) {
  const live = caching.model.run({ ...caching.model.defaults, ...inputs }) as Record<string, number>;
  const rand = rng(seed);
  const hitShare = (live.hitRatePct ?? 0) / 100;
  let above = 0;
  let max = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const ms = replyLatencyMs(rand() < hitShare, live, rand);
    if (ms > live.p95!) above++;
    max = Math.max(max, ms);
  }
  return { share: above / n, max, p95: live.p95! };
}

describe("replyLatencyMs", () => {
  it("puts about 5% of reads above p95 with no cache, as step 1 says", () => {
    const r = shareAboveP95({ hitRate: 0 }, 1);
    expect(r.share).toBeGreaterThan(0.035);
    expect(r.share).toBeLessThan(0.065);
    expect(r.max).toBeLessThan(r.p95 * 1.3);
  });

  it("puts about 5% of reads above p95 at the default hit rate", () => {
    const r = shareAboveP95({}, 2);
    expect(r.share).toBeGreaterThan(0.035);
    expect(r.share).toBeLessThan(0.065);
  });

  it("never shows a hit slower than p95, even when the slowest 5% are hits", () => {
    const live = caching.model.run({ ...caching.model.defaults, hitRate: 0.97 }) as Record<string, number>;
    const rand = rng(3);
    for (let i = 0; i < 5000; i++) expect(replyLatencyMs(true, live, rand)).toBeLessThanOrEqual(live.p95!);
    expect(shareAboveP95({ hitRate: 0.97 }, 4).share).toBeLessThanOrEqual(0.05);
  });
});
