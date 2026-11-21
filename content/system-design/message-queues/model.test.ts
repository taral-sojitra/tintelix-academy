import { formatOutput } from "@tintelix/schema/format";
import { mqModel } from "./model";

const run = (extra: Record<string, number>) => mqModel.run({ ...mqModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("message queue model", () => {
  it("calling the workers directly: the spike over capacity fails", () => {
    expect(show({ elapsedSec: 10 }, "failingPct")).toBe("75%");
    expect(show({ elapsedSec: 1 }, "failingPct")).toBe("0%");
    expect(show({}, "failedTotal")).toBe("45,000");
  });

  it("a queue takes everything and drains it later", () => {
    const q = { mode: 1 };
    expect(show(q, "failedTotal")).toBe("0");
    expect(show(q, "peakBacklog")).toBe("45,000");
    expect(show(q, "maxWaitSec")).toBe("90 s");
    expect(show(q, "drainSec")).toBe("3 min");
    expect(show({ ...q, elapsedSec: 12 }, "backlog")).toBe("15,000");
    expect(show({ ...q, elapsedSec: 82 }, "backlog")).toBe("30,000");
    expect(show({ ...q, workers: 8 }, "drainSec")).toBe("38 s");
  });

  it("poison messages retried forever eat the workers", () => {
    expect(show({ mode: 2 }, "poisonRps")).toBe("2");
    expect(show({ mode: 2 }, "wastedAtHorizonPct")).toBe("48%");
    expect(show({ mode: 2, elapsedSec: 60 }, "wastedPct")).toBe("24%");
  });

  it("a dead-letter queue caps the waste and keeps the bad ones for a person", () => {
    expect(show({ mode: 3 }, "wastedPct")).toBe("1.2%");
    expect(show({ mode: 3 }, "dlqAtHorizon")).toBe("240");
  });
});
