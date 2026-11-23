import { formatOutput } from "@tintelix/schema/format";
import { exchangeModel } from "./model";

const run = (extra: Record<string, number> = {}) => exchangeModel.run({ ...exchangeModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("stock exchange model", () => {
  it("400 million orders in a 6.5-hour session, 8× at the open", () => {
    expect(show({}, "avgRate")).toBe("17,094");
    expect(show({}, "peakRate")).toBe("136,752");
  });

  it("matching by database query: fine at launch, hopeless at the open", () => {
    expect(show({ mode: 1 }, "dbRate")).toBe("684");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("14%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("2,735%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("96%");
  });

  it("in memory, the busiest stock's thread is 3.4% busy", () => {
    expect(show({ mode: 3 }, "hotBusyPct")).toBe("3.4%");
    expect(show({ mode: 3, hotSharePct: 50 }, "hotBusyPct")).toBe("34%");
    expect(show({}, "hotSharePct")).toBe("5%");
  });

  it("journal and market data", () => {
    expect(show({}, "journalGb")).toBe("40");
    expect(show({}, "feedRate")).toBe("170,940");
    expect(show({}, "unicastM")).toBe("342");
    expect(show({ subscribers: 500 }, "unicastM")).toBe("85");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ ordersPerDay: -1, sessionHours: 0, dbCap: 0, matchUs: Number.NaN, engines: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
