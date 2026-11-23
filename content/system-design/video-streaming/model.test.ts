import { formatOutput } from "@tintelix/schema/format";
import { videoModel } from "./model";

const run = (extra: Record<string, number> = {}) => videoModel.run({ ...videoModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("video streaming model (book chapter 128's numbers)", () => {
  it("25 Tbps at peak and a 3 PB library", () => {
    expect(show({}, "peakTbps")).toBe("25");
    expect(show({}, "libraryPb")).toBe("3");
    expect(show({}, "streamsM")).toBe("5");
  });

  it("streaming straight from the store works at launch and drowns it at peak", () => {
    expect(show({ mode: 1 }, "originBusyPct")).toBe("2.5%");
    expect(show({ mode: 2 }, "originBusyPct")).toBe("1,250%");
    expect(show({ mode: 2 }, "originFailPct")).toBe("92%");
    expect(show({ mode: 3 }, "originBusyPct")).toBe("1,250%");
  });

  it("encoding once in parallel segments makes a new episode playable in seconds, not an hour and a half", () => {
    expect(show({}, "serialMin")).toBe("90");
    expect(show({}, "segments")).toBe("900");
    expect(show({}, "parallelSec")).toBe("38 s");
    expect(show({ workers: 900 }, "parallelSec")).toBe("26 s");
  });

  it("the edge's hit ratio decides the origin's size: 98% leaves 0.5 Tbps, 70% leaves 7.5", () => {
    expect(show({ mode: 4 }, "originTbps")).toBe("0.5");
    expect(show({ mode: 4 }, "originBusyPct")).toBe("25%");
    expect(show({ mode: 4, edgeHitPct: 70 }, "originTbps")).toBe("7.5");
    expect(show({ mode: 4, edgeHitPct: 70 }, "originBusyPct")).toBe("375%");
  });

  it("release night without pushing the new title ahead overwhelms the origin", () => {
    expect(show({ mode: 5 }, "liveHitPct")).toBe("59%");
    expect(show({ mode: 5 }, "originBusyPct")).toBe("515%");
    expect(show({ mode: 5 }, "originFailPct")).toBe("81%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ streams: -1, originCapTbps: 0, workers: 0, segmentSec: 0, edgeHitPct: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
