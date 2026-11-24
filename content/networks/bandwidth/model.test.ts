import { formatOutput } from "@tintelix/schema/format";
import { bandwidthModel } from "./model";

const run = (extra: Record<string, number> = {}) => bandwidthModel.run({ ...bandwidthModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("bandwidth and throughput model", () => {
  it("0.1% loss at an 80 ms round trip lets one TCP flow reach 5.6 of 100 Mbit/s", () => {
    expect(show({}, "lossLimitMbps")).toBe("5.6");
    expect(show({}, "throughputMbps")).toBe("5.6");
    expect(show({}, "utilPct")).toBe("5.6%");
  });

  it("a 100 MB file: 8 s on a full pipe, over 2 minutes at that rate", () => {
    expect(show({}, "idealSec")).toBe("8 s");
    expect(show({}, "actualSec")).toBe("2 min");
  });

  it("filling the pipe takes 1,000 KB in flight", () => {
    expect(show({}, "bdpKB")).toBe("1,000");
  });

  it("closer and cleaner gets close to the pipe; no loss means the pipe is the limit", () => {
    expect(show({ rttMs: 10 }, "throughputMbps")).toBe("45");
    expect(run({ lossPct: 0 }).throughputMbps).toBe(100);
    expect(run({ lossPct: 0 }).lossLimitMbps).toBe(100000);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ bandwidthMbps: 0 }).bandwidthMbps).toBe(1);
    expect(run({ rttMs: Number.NaN }).rttMs).toBe(80);
  });
});
