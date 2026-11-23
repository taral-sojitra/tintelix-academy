import { formatOutput } from "@tintelix/schema/format";
import { suggestModel } from "./model";

const run = (extra: Record<string, number> = {}) => suggestModel.run({ ...suggestModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("search autocomplete model", () => {
  it("50 million people, 8 searches, 6 suggestion requests each", () => {
    expect(show({}, "suggestRate")).toBe("27,778");
    expect(show({}, "suggestPeak")).toBe("55,556");
  });

  it("a sorted prefix query is fine at launch and swamps the database at full traffic", () => {
    expect(show({ mode: 1 }, "queryMs")).toBe("30 ms");
    expect(show({ mode: 1 }, "rate")).toBe("556");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("26%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("2,568%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("96%");
  });

  it("short prefixes match far more rows", () => {
    expect(show({ mode: 2, prefixLen: 1 }, "queryMs")).toBe("769 ms");
    expect(show({ mode: 2, prefixLen: 3 }, "queryMs")).toBe("1 ms");
    expect(show({ mode: 2, prefixLen: 1 }, "matchRows")).toBe("3,846,154");
  });

  it("a trie with top 5 cached per node fits in memory on a few servers", () => {
    expect(show({ mode: 3 }, "trieGb")).toBe("19");
    expect(show({ mode: 3 }, "trieServers")).toBe("3");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("0%");
  });

  it("the browser cache answers some typing before it leaves the device", () => {
    expect(show({ mode: 5 }, "browserHitPct")).toBe("30%");
    expect(show({ mode: 5 }, "serverRate")).toBe("38,889");
    expect(show({ mode: 3 }, "browserHitPct")).toBe("0%");
    expect(show({ mode: 3 }, "serverRate")).toBe("55,556");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ dailyUsers: -1, prefixLen: 0, dbCores: 0, scanRate: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
