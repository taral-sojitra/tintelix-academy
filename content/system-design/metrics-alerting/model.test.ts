import { formatOutput } from "@tintelix/schema/format";
import { metricsModel } from "./model";

const run = (extra: Record<string, number> = {}) => metricsModel.run({ ...metricsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("metrics and alerting model", () => {
  it("12 million series scraped every 15 s: 800,000 samples a second", () => {
    expect(show({}, "seriesM")).toBe("12");
    expect(show({}, "sampleRate")).toBe("800,000");
    expect(show({}, "rawTbDay")).toBe("1.1");
  });

  it("rows in one database: fine at launch, 400% at full size", () => {
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("20%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("400%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("75%");
    expect(show({}, "rawPoints")).toBe("172,800");
  });

  it("a sharded, compressed store: 50% busy, 104 GB a day", () => {
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("50%");
    expect(show({ mode: 3 }, "compGbDay")).toBe("104");
  });

  it("rollups: two years in 12 TB instead of 76, a 30-day graph from 720 points", () => {
    expect(show({ mode: 4 }, "rollupTb")).toBe("12");
    expect(show({ mode: 4 }, "rawTb2y")).toBe("76");
    expect(show({ mode: 4 }, "rollupPoints")).toBe("720");
    expect(show({ mode: 4, rawDays: 60 }, "rollupTb")).toBe("17");
  });

  it("cardinality: a user-ID label turns 2,500 series into 25 million (book chapter 101)", () => {
    expect(show({ userIds: 0 }, "badSeries")).toBe("2,500");
    expect(show({}, "badSeries")).toBe("25,000,000");
    expect(show({}, "seriesMemMb")).toBe("50,000");
    expect(show({ userIds: 0 }, "seriesMemMb")).toBe("5");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ hosts: -1, scrapeSec: 0, dbCap: 0, nodes: 0, rawDays: Number.NaN, userIds: -5 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
