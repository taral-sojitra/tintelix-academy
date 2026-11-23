import { formatOutput } from "@tintelix/schema/format";
import { ordersModel } from "./model";

const run = (extra: Record<string, number> = {}) => ordersModel.run({ ...ordersModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("orders and inventory model (book chapters 135 and 137)", () => {
  it("40 million stock rows; a normal day is tiny, a flash sale is not", () => {
    expect(show({}, "rowsM")).toBe("40");
    expect(show({}, "storageGb")).toBe("4");
    expect(show({}, "readAvg")).toBe("116");
    expect(show({}, "writeAvg")).toBe("2.3");
    expect(show({}, "flashReads")).toBe("8,333");
    expect(show({}, "flashWrites")).toBe("833");
  });

  it("check, pay, then subtract oversells during a flash sale", () => {
    expect(show({ mode: 2 }, "oversold")).toBe("1,667");
    expect(show({ mode: 2 }, "failPct")).toBe("25%");
    expect(show({ mode: 3 }, "oversold")).toBe("0");
  });

  it("the guarded update is correct, but one row can't take 833 updates a second", () => {
    expect(show({ mode: 3 }, "soldOut")).toBe("45,000");
    expect(show({ mode: 3 }, "hotBusyPct")).toBe("167%");
    expect(show({ mode: 3 }, "failPct")).toBe("40%");
  });

  it("ten sub-counters bring each row to 17%", () => {
    expect(show({ mode: 4 }, "hotBusyPct")).toBe("17%");
    expect(show({ mode: 4 }, "failPct")).toBe("0%");
    expect(show({ mode: 4, subCounters: 2 }, "hotBusyPct")).toBe("83%");
  });

  it("the saga releases stock for declined payments", () => {
    expect(show({}, "declinesPerDay")).toBe("4,500");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ skus: -1, stock: 0, rowCap: 0, subCounters: 0, windowSec: 0, payGapSec: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
