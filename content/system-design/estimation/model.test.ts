import { formatOutput } from "@tintelix/schema/format";
import { estimationModel } from "./model";

const run = (extra: Record<string, number>) => estimationModel.run({ ...estimationModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("estimation model", () => {
  it("follows the book: 10 million monthly users to 926 requests a second on average, 2,778 at peak", () => {
    const o = run({});
    expect(o.dau).toBe(2000000);
    expect(o.perDay).toBe(80000000);
    expect(o.avgRps).toBeCloseTo(925.93, 2);
    expect(show({}, "avgRps")).toBe("926");
    expect(show({}, "peakRps")).toBe("2,778");
  });

  it("sizes cores at the utilization target, not flat out", () => {
    expect(run({}).coresNaive).toBe(14);
    expect(run({}).cores).toBe(24);
    expect(run({ targetUtilPct: 90 }).cores).toBe(16);
    expect(run({}).perCoreAtTarget).toBe(120);
  });

  it("adds up the storage", () => {
    expect(show({}, "storagePerDayGb")).toBe("4");
    expect(show({}, "storageYearTb")).toBe("1.5");
    expect(show({}, "storageTotalTb")).toBe("4.4");
  });

  it("compounds 5% a month for 12 months to about 1.8×", () => {
    const o = run({});
    expect(o.growthFactor).toBeCloseTo(1.7959, 4);
    expect(o.simpleGrowth).toBeCloseTo(1.6, 9);
    expect(show({}, "futurePeakRps")).toBe("4,988");
    expect(o.futureCores).toBe(42);
  });

  it("stays finite at the slider ends", () => {
    const ends: Record<string, number>[] = [{ peakRatio: 1 }, { peakRatio: 6 }, { targetUtilPct: 40 }, { targetUtilPct: 90 }, { recordKb: 0.5 }, { recordKb: 20 }, { growthPct: 0 }, { growthPct: 15 }];
    for (const extra of ends) for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
  });
});
