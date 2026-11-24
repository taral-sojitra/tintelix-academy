import { formatOutput } from "@tintelix/schema/format";
import { mapsModel } from "./model";

const run = (extra: Record<string, number> = {}) => mapsModel.run({ ...mapsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("maps and navigation model", () => {
  it("map tiles: 12 million requests a second, and drawing each on request melts the renderers", () => {
    expect(show({}, "tileRate")).toBe("12,000,000");
    expect(show({}, "tileGBs")).toBe("240");
    expect(show({ mode: 1 }, "renderBusyPct")).toBe("48%");
    expect(show({ mode: 2 }, "renderBusyPct")).toBe("24,000%");
    expect(show({ mode: 2 }, "renderFailPct")).toBe("99.5%");
    expect(show({ mode: 3 }, "renderBusyPct")).toBe("0%");
  });

  it("pre-drawn tiles: 4^zoom tiles per level, the CDN takes 98% and the store the rest", () => {
    expect(show({}, "tilesB")).toBe("4.3");
    expect(show({}, "tileKm")).toBe("0.6");
    expect(show({}, "storageTb")).toBe("115");
    expect(show({ mode: 3 }, "originRate")).toBe("240,000");
    expect(show({ mode: 3, cdnHitPct: 90 }, "originRate")).toBe("1,200,000");
  });

  it("routing: a search spreading in a circle grows with the trip squared; shortcuts don't", () => {
    expect(show({ mode: 4 }, "naiveExplored")).toBe("628,319");
    expect(show({ mode: 4, tripKm: 80 }, "naiveExplored")).toBe("2,513,274");
    expect(show({ mode: 4 }, "naiveMs")).toBe("314 ms");
    expect(show({ mode: 4 }, "coresNaive")).toBe("25,133");
    expect(show({ mode: 4 }, "routeBusyPct")).toBe("1,257%");
    expect(show({ mode: 4 }, "routeFailPct")).toBe("92%");
    expect(show({ mode: 5 }, "coresHier")).toBe("40");
    expect(show({ mode: 5 }, "routeBusyPct")).toBe("2%");
    expect(show({ mode: 5 }, "explored")).toBe("1,000");
    expect(show({ mode: 4 }, "explored")).toBe("628,319");
    expect(show({}, "pingRate")).toBe("800,000");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ mapUsers: -1, renderCapacity: 0, zoom: 99, tripKm: Number.NaN, exploreRate: 0, routeCores: 0, pingEvery: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
