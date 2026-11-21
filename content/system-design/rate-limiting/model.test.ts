import { formatOutput } from "@tintelix/schema/format";
import { limitModel } from "./model";

const run = (extra: Record<string, number>) => limitModel.run({ ...limitModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("rate limiting model", () => {
  it("one flooding client drags everyone down", () => {
    expect(show({}, "offered")).toBe("2,500");
    expect(show({}, "successPct")).toBe("40%");
    expect(show({}, "flooderAllowed")).toBe("2,000");
  });

  it("a token bucket per client holds the flooder to its rate", () => {
    expect(show({ mode: 1 }, "flooderAllowed")).toBe("10");
    expect(show({ mode: 1 }, "refusedRps")).toBe("1,990");
    expect(show({ mode: 1 }, "successPct")).toBe("100%");
  });

  it("the bucket lets a burst through that a strict per-second limit would cut", () => {
    expect(show({ mode: 1 }, "burstAllowed")).toBe("30");
    expect(show({ mode: 1 }, "windowAllowed")).toBe("10");
    expect(show({ mode: 1, bucket: 20 }, "burstAllowed")).toBe("20");
    expect(show({ mode: 1 }, "refillSec")).toBe("5 s");
  });

  it("separate buckets on each server multiply the limit", () => {
    expect(show({ mode: 2 }, "flooderAllowed")).toBe("40");
    expect(show({ mode: 2 }, "sharedAllowed")).toBe("10");
  });
});
