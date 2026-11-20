import { queueModel } from "./model";

const run = (extra: Record<string, number>) => queueModel.run({ ...queueModel.defaults, ...extra }) as Record<string, number>;

describe("queueing model", () => {
  it("half busy: a request already waits one request's work", () => {
    const o = run({});
    expect(o.utilPct).toBeCloseTo(50, 9);
    expect(o.waitMs).toBeCloseTo(10, 9);
    expect(o.responseMs).toBeCloseTo(20, 9);
    expect(o.inSystem).toBeCloseTo(1, 9);
    expect(o.inLine).toBeCloseTo(0.5, 9);
    expect(o.capacity).toBe(100);
  });

  it("follows the M/M/1 curve from the book", () => {
    expect(run({ traffic: 80 }).waitMs).toBeCloseTo(40, 9);
    expect(run({ traffic: 80 }).responseMs).toBeCloseTo(50, 9);
    expect(run({ traffic: 88 }).waitMs).toBeCloseTo(73.333, 2);
    expect(run({ traffic: 95 }).responseMs).toBeCloseTo(200, 9);
  });

  it("at the evening peak, 90% busy is ten times slower, with nine requests inside", () => {
    const o = run({ traffic: 90 });
    expect(o.utilPct).toBeCloseTo(90, 9);
    expect(o.sparePct).toBeCloseTo(10, 9);
    expect(o.waitMs).toBeCloseTo(90, 9);
    expect(o.responseMs).toBeCloseTo(100, 9);
    expect(o.slowdown).toBeCloseTo(10, 9);
    expect(o.inSystem).toBeCloseTo(9, 9);
  });

  it("a second worker on the same line halves the busyness and nearly removes the wait", () => {
    const o = run({ traffic: 90, workers: 2 });
    expect(o.utilPct).toBeCloseTo(45, 9);
    expect(o.waitChancePct).toBeCloseTo(27.93, 2);
    expect(o.waitMs).toBeCloseTo(2.539, 3);
    expect(o.responseMs).toBeCloseTo(12.539, 3);
    expect(o.capacity).toBe(200);
  });

  it("one worker's chance of waiting is its busyness", () => {
    expect(run({ traffic: 70 }).waitChancePct).toBeCloseTo(70, 9);
  });

  it("gives the cheatsheet's slowdowns for one worker", () => {
    const o = run({});
    expect([o.slowdownAt50, o.slowdownAt80, o.slowdownAt90, o.slowdownAt95].map((x) => Math.round(x! * 1e6) / 1e6)).toEqual([2, 5, 10, 20]);
  });

  it("stays finite at and beyond full capacity", () => {
    const ends: Record<string, number>[] = [{ traffic: 99 }, { traffic: 100 }, { traffic: 500 }, { traffic: 90, workers: 4 }, { traffic: 10 }];
    for (const extra of ends) {
      for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
    }
    expect(run({ traffic: 500 }).utilPct).toBeLessThan(100);
  });
});
