import { formatOutput } from "@tintelix/schema/format";
import { urlModel } from "./model";

const run = (extra: Record<string, number> = {}) => urlModel.run({ ...urlModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("URL shortener model", () => {
  it("turns 30 million new links a day into traffic and storage", () => {
    expect(show({}, "writeRate")).toBe("347");
    expect(show({}, "readRate")).toBe("13,889");
    expect(show({}, "linksB")).toBe("55");
    expect(show({}, "storageTb")).toBe("22");
  });

  it("seven base-62 characters leave plenty of codes; six run nearly out", () => {
    expect(show({}, "codeSpaceT")).toBe("3.5");
    expect(show({}, "codesUsedPct")).toBe("1.6%");
    expect(show({ codeLength: 6 }, "codesUsedPct")).toBe("96%");
    expect(show({}, "codeSpaceB")).toBe("3,522");
    expect(show({ codeLength: 6 }, "codeSpaceB")).toBe("57");
    expect(show({ codeLength: 5 }, "codeSpaceB")).toBe("0.9");
    expect(show({ codeLength: 5 }, "codesUsedPct")).toBe("100%");
  });

  it("one database copes at launch and drowns at full traffic", () => {
    expect(show({ mode: 0 }, "dbBusyPct")).toBe("2%");
    expect(show({ mode: 0 }, "dbFailPct")).toBe("0%");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("278%");
    expect(show({ mode: 1 }, "dbFailPct")).toBe("64%");
    expect(show({ mode: 1 }, "servedPct")).toBe("36%");
  });

  it("a cache in front takes nine reads in ten off the database", () => {
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("28%");
    expect(show({ mode: 2 }, "servedPct")).toBe("100%");
    expect(show({ mode: 2 }, "cacheReadRate")).toBe("12,500");
    expect(show({ mode: 2 }, "dbReadRate")).toBe("1,389");
    expect(show({ mode: 2, cacheHitPct: 50 }, "dbBusyPct")).toBe("139%");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("28%");
  });

  it("clicks arriving now: a trickle at launch, everything after", () => {
    expect(show({ mode: 0 }, "clickRate")).toBe("100");
    expect(show({ mode: 1 }, "clickRate")).toBe("13,889");
    expect(show({ mode: 2 }, "cacheMissPct")).toBe("10%");
  });

  it("repeat clicks are what a permanent redirect would hide", () => {
    expect(show({}, "repeatReadRate")).toBe("4,167");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ newPerDay: -5, readRatio: Number.NaN, codeLength: 0, dbReadCapacity: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
