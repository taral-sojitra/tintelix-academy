import { formatOutput } from "@tintelix/schema/format";
import { retryModel } from "./model";

const run = (extra: Record<string, number>) => retryModel.run({ ...retryModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("retries and circuit breakers model", () => {
  it("timeouts nest inside the caller's budget (§76.1)", () => {
    expect(show({}, "orderUsedMs")).toBe("700 ms");
    expect(show({}, "marginMs")).toBe("100 ms");
    expect(show({ pricingTimeoutMs: 800 }, "marginMs")).toBe("-300 ms");
  });

  it("a slow service plus immediate retries: a storm (§76.3)", () => {
    const s = { mode: 1 };
    expect(show(s, "inFlightNeeded")).toBe("200");
    expect(show(s, "slowCapacity")).toBe("125");
    expect(show(s, "offered")).toBe("1,500");
    expect(show(s, "successPct")).toBe("0%");
    expect(show(s, "userWaitMs")).toBe("900 ms");
  });

  it("jitter spreads each wave of retries", () => {
    expect(show({ mode: 1 }, "wavePeak")).toBe("500");
    expect(show({ mode: 2 }, "wavePeak")).toBe("125");
    expect(show({ mode: 2 }, "backoffMs")).toBe("400 ms");
  });

  it("a circuit breaker opens, fails fast, and closes once the service has recovered", () => {
    const b = { mode: 3 };
    expect(run({ ...b, elapsedSec: 1 }).breaker).toBe(0);
    expect(show({ ...b, elapsedSec: 1 }, "successPct")).toBe("0%");
    expect(run({ ...b, elapsedSec: 5 }).breaker).toBe(1);
    expect(show({ ...b, elapsedSec: 5 }, "offered")).toBe("0");
    expect(show({ ...b, elapsedSec: 5 }, "userWaitMs")).toBe("0 ms");
    expect(run(b).breaker).toBe(2);
    expect(show(b, "successPct")).toBe("100%");
    expect(show(b, "userWaitMs")).toBe("40 ms");
    expect(show(b, "openSec")).toBe("10 s");
  });
});
