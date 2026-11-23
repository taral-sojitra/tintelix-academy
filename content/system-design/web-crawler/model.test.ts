import { formatOutput } from "@tintelix/schema/format";
import { crawlerModel } from "./model";

const run = (extra: Record<string, number> = {}) => crawlerModel.run({ ...crawlerModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("web crawler model", () => {
  it("2 billion pages a month: 772 a second, 386 fetches in flight, 160 TB", () => {
    expect(show({}, "pageRate")).toBe("772");
    expect(show({}, "fetchers")).toBe("386");
    expect(show({}, "storageTb")).toBe("160");
  });

  it("a plain queue sends most fetches to one site, which blocks them", () => {
    expect(show({ mode: 1 }, "hotHostRate")).toBe("463");
    expect(show({ mode: 1 }, "hotFailPct")).toBe("98%");
    expect(show({ mode: 0 }, "hotFailPct")).toBe("0%");
  });

  it("per-host queues hold each site to one request a second", () => {
    expect(show({ mode: 2 }, "hotHostRate")).toBe("1");
    expect(show({ mode: 2 }, "hotFailPct")).toBe("0%");
    expect(show({ mode: 2 }, "hostsInParallel")).toBe("772");
    expect(show({ mode: 2, politeDelay: 2 }, "hostsInParallel")).toBe("1,543");
    expect(show({ mode: 2, politeDelay: 2 }, "hotHostRate")).toBe("0.5");
  });

  it("a Bloom filter drops links already seen, in a fraction of the memory", () => {
    expect(show({ mode: 3 }, "linkRate")).toBe("30,864");
    expect(show({ mode: 3 }, "newUrlRate")).toBe("3,086");
    expect(show({ mode: 3 }, "seenPct")).toBe("90%");
    expect(show({ mode: 3 }, "bloomGb")).toBe("6");
    expect(show({ mode: 3 }, "setGb")).toBe("80");
    expect(show({ mode: 3 }, "dedupSavedTb")).toBe("40");
  });

  it("a page budget per site caps a crawler trap", () => {
    expect(show({ mode: 4 }, "trapPages")).toBe("10,000");
    expect(show({ mode: 4 }, "trapDrawPct")).toBe("20%");
    expect(show({ mode: 3 }, "trapDrawPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ pagesPerMonth: -1, politeDelay: 0, fetchMs: Number.NaN, linksPerPage: -4 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
