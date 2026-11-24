import { formatOutput } from "@tintelix/schema/format";
import { rideModel } from "./model";

const run = (extra: Record<string, number> = {}) => rideModel.run({ ...rideModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("ride hailing model (book chapter 133's numbers)", () => {
  it("driver pings outnumber trip writes about 900 to 1", () => {
    expect(show({}, "pingRate")).toBe("1,250,000");
    expect(show({}, "tripWriteRate")).toBe("1,389");
    expect(show({}, "pingRatio")).toBe("900");
    expect(show({}, "pingMbps")).toBe("125");
  });

  it("writing every ping to the trips database works at launch and drowns it at scale", () => {
    expect(show({ mode: 1 }, "dbBusyPct")).toBe("28%");
    expect(show({ mode: 2 }, "dbBusyPct")).toBe("2,503%");
    expect(show({ mode: 2 }, "dbFailPct")).toBe("96%");
    expect(show({ mode: 3 }, "dbBusyPct")).toBe("2.8%");
  });

  it("matching reads seven cells and keeps 2,000 matches in flight (Little's Law)", () => {
    expect(show({ mode: 3 }, "candidates")).toBe("42");
    expect(show({ mode: 4 }, "inFlight")).toBe("2,000");
    expect(show({ mode: 4, matchTime: 4 }, "inFlight")).toBe("4,000");
    expect(show({ mode: 4 }, "clashPct")).toBe("100%");
    expect(show({ mode: 3 }, "clashPct")).toBe("0%");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ drivers: -1, pingEvery: 0, dbWriteCapacity: 0, matchTime: Number.NaN });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
