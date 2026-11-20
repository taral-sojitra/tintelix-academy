import { cachingModel } from "./model";

const run = (inputs: Record<string, number> = {}) => cachingModel.run({ ...cachingModel.defaults, ...inputs });

describe("caching model", () => {
  it("defaults give 480 reads, 7% busy and a 37 ms p95", () => {
    const out = run();
    expect(out.dbReads).toBeCloseTo(480, 6);
    expect(Math.round(out.dbBusyPct!)).toBe(7);
    expect(Math.round(out.p95!)).toBe(37);
  });

  it("with no cache the database is 92% busy and p95 is about 180 ms", () => {
    const out = run({ hitRate: 0 });
    expect(out.dbReads).toBe(6000);
    expect(Math.round(out.dbBusyPct!)).toBe(92);
    expect(Math.abs(out.p95! - 180)).toBeLessThanOrEqual(1);
  });

  it("an 82% hit rate gives 1,080 reads and a 38 ms p95", () => {
    const out = run({ hitRate: 0.82 });
    expect(out.dbReads).toBeCloseTo(1080, 6);
    expect(Math.round(out.p95!)).toBe(38);
  });

  it("once fewer than 5% of reads miss, p95 is a cache hit (25.5 ms)", () => {
    expect(run({ hitRate: 0.96 }).p95).toBe(25.5);
  });

  it("echoes traffic, capacity and the hit rate as outputs so text can quote them", () => {
    const out = run({ hitRate: 0.82 });
    expect(out.traffic).toBe(6000);
    expect(out.dbCapacity).toBe(6500);
    expect(Math.round(out.hitRatePct!)).toBe(82);
  });
});
