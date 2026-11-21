import { formatOutput } from "@tintelix/schema/format";
import { scalingModel } from "./model";

const run = (extra: Record<string, number>) => scalingModel.run({ ...scalingModel.defaults, ...extra }) as Record<string, number>;

describe("scaling model", () => {
  it("scaling up: a bigger box serves cores × 200 a second", () => {
    expect(run({ cores: 32 }).capacity).toBe(6400);
    expect(run({ cores: 32, traffic: 6000 }).servedPct).toBe(100);
  });

  it("the biggest box runs out at 64 cores", () => {
    const o = run({ traffic: 20000, cores: 200 });
    expect(o.cores).toBe(64);
    expect(o.capacity).toBe(12800);
    expect(o.servedPct).toBeCloseTo(64, 9);
  });

  it("scaling out with nothing shared is linear", () => {
    const o = run({ horizontal: 1, nodes: 16, traffic: 20000 });
    expect(o.speedup).toBeCloseTo(16, 9);
    expect(o.capacity).toBe(25600);
    expect(o.servedPct).toBe(100);
  });

  it("follows the book's Universal Scalability Law example (σ 3%, κ 0.05%)", () => {
    const x = { horizontal: 1, sigmaPct: 3, kappaPct: 0.05 };
    expect(run({ ...x, nodes: 44 }).speedup).toBeCloseTo(13.6, 1);
    expect(run({ ...x, nodes: 100 }).speedup).toBeCloseTo(11.2, 1);
    expect(run({ ...x, nodes: 16 }).speedup).toBeCloseTo(10.19, 2);
    expect(run(x).peakNodes).toBe(44);
    expect(run(x).peakCapacity).toBeCloseTo(13.6 * 1600, -2);
  });

  it("Amdahl's ceiling is one over the serial share", () => {
    expect(run({ horizontal: 1, sigmaPct: 5 }).amdahlCeiling).toBeCloseTo(20, 9);
    expect(run({ horizontal: 1, sigmaPct: 5, nodes: 8 }).speedup).toBeCloseTo(5.93, 2);
  });

  it("reads speedup and efficiency sensibly", () => {
    expect(formatOutput("speedup", run({ horizontal: 1, sigmaPct: 3, kappaPct: 0.05, nodes: 16 }).speedup!)).toBe("10");
    expect(run({ horizontal: 1, sigmaPct: 3, kappaPct: 0.05, nodes: 16 }).efficiencyPct).toBeCloseTo(63.7, 1);
  });

  it("stays finite at the slider ends", () => {
    const ends: Record<string, number>[] = [{ cores: 1 }, { cores: 64 }, { horizontal: 1, nodes: 1 }, { horizontal: 1, nodes: 100, sigmaPct: 3, kappaPct: 0.05 }, { horizontal: 1, kappaPct: 0 }];
    for (const extra of ends) for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
  });
});
