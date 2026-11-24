import { formatOutput } from "@tintelix/schema/format";
import { clicksModel } from "./model";

const run = (extra: Record<string, number> = {}) => clicksModel.run({ ...clicksModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("ad click aggregation model", () => {
  it("8 billion clicks a day peak at 277,778 a second", () => {
    expect(show({}, "avgRate")).toBe("92,593");
    expect(show({}, "peakRate")).toBe("277,778");
  });

  it("a counter update per click: fine at launch, 556% at peak, and retries count twice", () => {
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("5.6%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("556%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("82%");
    expect(show({ mode: 2 }, "dupsM")).toBe("40");
  });

  it("aggregating per ad per minute writes 10,000 rows a second", () => {
    expect(show({ mode: 3 }, "dbWrites")).toBe("10,000");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("20%");
  });

  it("the watermark's slack trades late clicks against waiting", () => {
    expect(show({}, "slackSec")).toBe("30 s");
    expect(show({}, "latePct")).toBe("1.6%");
    expect(show({}, "lateM")).toBe("125");
    expect(show({ slackSec: 120 }, "latePct")).toBe("0.74%");
    expect(show({ slackSec: 5 }, "latePct")).toBe("10%");
  });

  it("deduplicating click IDs removes the double counts", () => {
    expect(show({ mode: 5 }, "dupsLeft")).toBe("0");
    expect(show({ mode: 4 }, "dupsLeft")).toBe("40");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ clicksPerDay: -1, dbCap: 0, slackSec: -5, onlineMeanSec: 0, offlineMeanSec: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
