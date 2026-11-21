import { formatOutput } from "@tintelix/schema/format";
import { availabilityModel } from "./model";

const run = (extra: Record<string, number>) => availabilityModel.run({ ...availabilityModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("availability model", () => {
  it("five 99.9% services in a row: 99.5%, 3 h 39 min down a month", () => {
    expect(show({}, "perAvail")).toBe("99.9%");
    expect(show({}, "perDowntime")).toBe("43.8 min");
    expect(run({}).pathAvail).toBeCloseTo(99.501, 3);
    expect(show({}, "pathAvail")).toBe("99.5%");
    expect(show({}, "pathDowntime")).toBe("3 h 39 min");
    expect(run({}).failedPerMillion).toBeCloseTo(4990, 0);
    expect(run({}).nines).toBeCloseTo(2.302, 3);
    expect(show({}, "neededEachAvail")).toBe("99.98%");
  });

  it("more services in the path lose more", () => {
    expect(run({ services: 6 }).pathAvail).toBeCloseTo(99.4015, 3);
    expect(show({ services: 1 }, "pathAvail")).toBe("99.9%");
  });

  it("two independent copies of each service: down only when both are", () => {
    const o = run({ copies: 2 });
    expect(o.tierAvail).toBeCloseTo(99.9999, 6);
    expect(show({ copies: 2 }, "pathAvail")).toBe("99.9995%");
    expect(show({ copies: 2 }, "pathDowntime")).toBe("13 s");
  });

  it("copies that share a failure mode: the shared part sets the answer", () => {
    const x = { copies: 2, sharedPct: 0.05 };
    expect(show(x, "tierAvail")).toBe("99.94%");
    expect(show(x, "pathAvail")).toBe("99.7%");
    expect(show(x, "pathDowntime")).toBe("1 h 50 min");
    expect(show(x, "sharedDowntime")).toBe("21.9 min");
  });

  it("a shared failure means nothing with one copy", () => {
    expect(run({ sharedPct: 0.05 }).pathAvail).toBeCloseTo(run({}).pathAvail!, 9);
  });

  it("stays finite at the slider ends", () => {
    const ends: Record<string, number>[] = [{ services: 1 }, { services: 8 }, { copies: 3 }, { copies: 3, sharedPct: 0 }, { copies: 2, sharedPct: 0.2 }];
    for (const extra of ends) for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
  });
});
