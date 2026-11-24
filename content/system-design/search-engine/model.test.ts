import { formatOutput } from "@tintelix/schema/format";
import { searchModel } from "./model";

const run = (extra: Record<string, number> = {}) => searchModel.run({ ...searchModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("search engine model (book chapter 139's numbers)", () => {
  it("2 billion documents: 926 indexed and 2,315 searched a second, 8 TB", () => {
    expect(show({ mode: 0 }, "scanFailPct")).toBe("0%");
    expect(show({}, "docsB")).toBe("2");
    expect(show({}, "indexRate")).toBe("926");
    expect(show({}, "indexPeak")).toBe("2,778");
    expect(show({}, "queryRate")).toBe("2,315");
    expect(show({}, "queryPeak")).toBe("6,944");
    expect(show({}, "totalTb")).toBe("8");
  });

  it("scanning every document with LIKE works on a million and fails on two billion", () => {
    expect(show({ mode: 1 }, "scanMs")).toBe("200 ms");
    expect(show({ mode: 1 }, "scanFailPct")).toBe("0%");
    expect(show({ mode: 2 }, "scanSec")).toBe("7 min");
    expect(show({ mode: 2 }, "scanFailPct")).toBe("100%");
  });

  it("an inverted index over 20 shards answers in tens of milliseconds", () => {
    expect(show({ mode: 3 }, "shards")).toBe("20");
    expect(show({ mode: 3 }, "queryMs")).toBe("30 ms");
  });

  it("the refresh interval trades indexing lag for merge work", () => {
    expect(show({ mode: 4 }, "lagSec")).toBe("2 s");
    expect(show({ mode: 4 }, "segmentsPerMin")).toBe("1,200");
    expect(show({ mode: 4, refreshSec: 10 }, "lagSec")).toBe("11 s");
    expect(show({ mode: 4, refreshSec: 10 }, "segmentsPerMin")).toBe("120");
  });

  it("a trending term is answered from a results cache", () => {
    expect(show({ mode: 5 }, "hotQueryRate")).toBe("2,083");
    expect(show({ mode: 5 }, "hotToShards")).toBe("417");
    expect(show({ mode: 5 }, "cacheHitPct")).toBe("80%");
    expect(show({ mode: 3 }, "cacheHitPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ docs: -1, refreshSec: 0, shardTb: 0, scanRate: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
