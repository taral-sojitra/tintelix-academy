import { formatOutput } from "@tintelix/schema/format";
import { dnsModel } from "./model";

const run = (extra: Record<string, number> = {}) => dnsModel.run({ ...dnsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("DNS model", () => {
  it("a cold walk costs 170 ms, a usual miss 100 ms, a cache hit 20 ms", () => {
    expect(show({}, "coldMs")).toBe("170 ms");
    expect(show({}, "warmMs")).toBe("100 ms");
    expect(show({}, "cachedMs")).toBe("20 ms");
  });

  it("a 300 s TTL with 1,000 lookups an hour answers 99% from the cache", () => {
    const d = run();
    expect(d.missesPerHour).toBe(12);
    expect(show({}, "hitPct")).toBe("99%");
    expect(run().hitPct).toBeCloseTo(98.8);
    expect(show({}, "avgMs")).toBe("21 ms");
    expect(run().changeMin).toBe(5);
  });

  it("a 30 s TTL misses ten times as often, but changes spread in half a minute", () => {
    expect(run({ ttlSec: 30 }).missesPerHour).toBe(120);
    expect(show({ ttlSec: 30 }, "hitPct")).toBe("88%");
    expect(show({ ttlSec: 30 }, "changeMin")).toBe("0.5");
  });

  it("can't miss more often than it's asked", () => {
    expect(run({ ttlSec: 30, lookupsPerHour: 50 }).missesPerHour).toBe(50);
    expect(run({ ttlSec: 30, lookupsPerHour: 50 }).hitPct).toBe(0);
  });

  it("tells the widget what to show in each mode", () => {
    expect([0, 1, 2, 3].map((mode) => run({ mode }).dnsStage)).toEqual([0, 1, 2, 2]);
  });
});
