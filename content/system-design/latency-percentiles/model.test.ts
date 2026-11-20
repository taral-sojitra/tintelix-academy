import { latencyModel } from "./model";

const run = (extra: Record<string, number>) => latencyModel.run({ ...latencyModel.defaults, ...extra }) as Record<string, number>;

describe("latency model", () => {
  it("at the defaults, the average sits between the humps", () => {
    const o = run({});
    expect(o.meanMs).toBeCloseTo(11.9, 9);
    expect(o.callP50Ms).toBe(2);
    expect(o.callP99Ms).toBe(200);
    expect(o.slowPerDay).toBeCloseTo(50000, 6);
    expect(o.fastPct).toBe(95);
    expect(o.pageSlowPct).toBeCloseTo(5, 9);
  });

  it("p99 stays fast just under 1% slow and jumps just over it, while the average barely moves", () => {
    expect(run({ slowPct: 0.9 }).meanMs).toBeCloseTo(3.782, 9);
    expect(run({ slowPct: 0.9 }).callP99Ms).toBe(2);
    expect(run({ slowPct: 1.1 }).meanMs).toBeCloseTo(4.178, 9);
    expect(run({ slowPct: 1.1 }).callP99Ms).toBe(200);
  });

  it("uses the nearest-rank rule at exactly 1% slow", () => {
    expect(run({ slowPct: 1 }).callP99Ms).toBe(2);
  });

  it("a page waits for the slowest of its calls", () => {
    const ten = run({ slowPct: 1, calls: 10 });
    expect(ten.pageSlowPct).toBeCloseTo(9.5618, 3);
    expect(ten.pageP50Ms).toBe(2);
    expect(ten.pageP99Ms).toBe(200);
    const hundred = run({ slowPct: 1, calls: 100 });
    expect(hundred.pageSlowPct).toBeCloseTo(63.397, 2);
    expect(hundred.pageP50Ms).toBe(200);
  });

  it("hedging after 10 ms copies the slow 1% and pulls page p99 to 12 ms", () => {
    const o = run({ slowPct: 1, calls: 10, hedge: 1 });
    expect(o.hedgedPct).toBe(1);
    expect(o.hedgeReplyMs).toBe(12);
    expect(o.pageP99Ms).toBe(12);
    expect(o.pageSlowPct).toBeCloseTo(0.09996, 4);
    expect(o.meanMs).toBeCloseTo(2.1188, 9);
  });

  it("hedging too early copies every call; too late never helps", () => {
    const early = run({ slowPct: 1, calls: 10, hedge: 1, hedgeMs: 1 });
    expect(early.hedgedPct).toBe(100);
    expect(early.pageP99Ms).toBe(3);
    const late = run({ slowPct: 1, calls: 10, hedge: 1, hedgeMs: 199 });
    expect(late.hedgedPct).toBe(1);
    expect(late.pageP99Ms).toBe(200);
    expect(late.pageSlowPct).toBeCloseTo(9.5618, 3);
    const never = run({ slowPct: 1, calls: 10, hedge: 1, hedgeMs: 250 });
    expect(never.hedgedPct).toBe(0);
    expect(never.pageP99Ms).toBe(200);
  });

  it("splits every page into fast, hedged and slow shares that add up to 100", () => {
    const cases: Record<string, number>[] = [{}, { slowPct: 1, calls: 10 }, { slowPct: 1, calls: 10, hedge: 1 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 1 }];
    for (const extra of cases) {
      const o = run(extra);
      expect(o.pageFastPct! + o.pageMidPct! + o.pageSlowPct!).toBeCloseTo(100, 9);
    }
    expect(run({}).pageMidPct).toBe(0);
  });

  it("stays finite at every slider end", () => {
    const ends: Record<string, number>[] = [{ slowPct: 0.1 }, { slowPct: 10 }, { slowPct: 1, calls: 100 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 1 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 250 }];
    for (const extra of ends) {
      for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("gives the cheatsheet's fan-out figures at the defaults", () => {
    expect(run({}).tenCallsSlowPct).toBeCloseTo(40.13, 2);
    expect(run({}).hundredCallsSlowPct).toBeCloseTo(99.41, 2);
  });

  it("matches the page average to the shares", () => {
    const o = run({ slowPct: 1, calls: 10, hedge: 1 });
    expect(o.pageMeanMs).toBeCloseTo((o.pageFastPct! * 2 + o.pageMidPct! * 12 + o.pageSlowPct! * 200) / 100, 9);
    expect(run({}).pageMeanMs).toBeCloseTo(11.9, 9);
  });
});
