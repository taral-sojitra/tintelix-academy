import { formatOutput } from "@tintelix/schema/format";
import { latencyModel } from "./model";

const run = (extra: Record<string, number> = {}) => latencyModel.run({ ...latencyModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("latency model", () => {
  it("7,000 km of fibre is 35 ms one way, 70 ms there and back, at best", () => {
    expect(show({}, "oneWayMs")).toBe("35 ms");
    expect(show({}, "propRttMs")).toBe("70 ms");
    expect(show({}, "vacuumOneWayMs")).toBe("23 ms");
  });

  it("hops and queues add to it: an 83 ms round trip, 85% of it distance", () => {
    expect(show({}, "hopMs")).toBe("3 ms");
    expect(show({}, "rttMs")).toBe("83 ms");
    expect(show({}, "propPct")).toBe("85%");
    expect(show({ queueMs: 100 }, "rttMs")).toBe("173 ms");
  });

  it("four round trips before the first byte, six for the page", () => {
    expect(show({}, "firstByteMs")).toBe("331 ms");
    expect(show({}, "pageMs")).toBe("497 ms");
  });

  it("a nearby edge server 50 km away cuts the page to 68 ms", () => {
    expect(show({}, "edgeRttMs")).toBe("11 ms");
    expect(show({}, "edgePageMs")).toBe("68 ms");
  });

  it("keeps bad inputs in range", () => {
    expect(run({ distanceKm: -5 }).oneWayMs).toBe(0.05);
    expect(run({ queueMs: Number.NaN }).queueMs).toBe(10);
  });
});
