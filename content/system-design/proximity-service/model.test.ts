import { formatOutput } from "@tintelix/schema/format";
import { nearbyModel } from "./model";

const run = (extra: Record<string, number> = {}) => nearbyModel.run({ ...nearbyModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("proximity service model", () => {
  it("200 million places, 17,361 searches a second at peak", () => {
    expect(show({}, "placesM")).toBe("200");
    expect(show({}, "searchRate")).toBe("5,787");
    expect(show({}, "searchPeak")).toBe("17,361");
  });

  it("separate latitude and longitude indexes read two huge bands", () => {
    expect(show({ mode: 1 }, "rowsPerQuery")).toBe("80,000");
    expect(show({ mode: 1 }, "latlonMs")).toBe("16 ms");
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("8.7%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("868%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("88%");
  });

  it("geohash length trades cells read against candidates to check", () => {
    expect(show({ mode: 3 }, "cellsRead")).toBe("40");
    expect(show({ mode: 3 }, "candidates")).toBe("8,930");
    expect(show({ mode: 3 }, "inCircle")).toBe("3,770");
    expect(show({ mode: 3 }, "geoMs")).toBe("11 ms");
    expect(show({ mode: 3, geoLen: 5 }, "cellsRead")).toBe("9");
    expect(show({ mode: 3, geoLen: 5 }, "candidates")).toBe("64,563");
    expect(show({ mode: 3, geoLen: 5 }, "geoMs")).toBe("65 ms");
    expect(show({ mode: 3, geoLen: 7 }, "cellsRead")).toBe("784");
    expect(show({ mode: 3, geoLen: 7 }, "geoMs")).toBe("45 ms");
  });

  it("the index fits in memory; a dozen servers, fewer with a cache", () => {
    expect(show({ mode: 4 }, "indexGb")).toBe("3.2");
    expect(show({ mode: 4 }, "searchServers")).toBe("12");
    expect(show({ mode: 5 }, "searchServers")).toBe("5");
    expect(show({ mode: 5 }, "cacheHitPct")).toBe("60%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ places: -1, geoLen: 99, radiusKm: 0, cityDensity: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
