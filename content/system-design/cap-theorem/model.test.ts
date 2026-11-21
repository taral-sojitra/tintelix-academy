import { formatOutput } from "@tintelix/schema/format";
import { capModel } from "./model";

const run = (extra: Record<string, number>) => capModel.run({ ...capModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("CAP model", () => {
  it("healthy: every request answered, correctly", () => {
    expect(show({}, "errorPct")).toBe("0%");
    expect(show({}, "stalePct")).toBe("0%");
  });

  it("split, consistency first: the minority side refuses its users", () => {
    expect(show({ mode: 1 }, "errorPct")).toBe("30%");
    expect(show({ mode: 1 }, "errorRps")).toBe("9,000");
    expect(show({ mode: 1 }, "stalePct")).toBe("0%");
    expect(run({ mode: 1 }).reconcile).toBe(0);
  });

  it("split, availability first: everyone answered, some from a copy that can't hear the others", () => {
    expect(show({ mode: 2 }, "errorPct")).toBe("0%");
    expect(show({ mode: 2 }, "stalePct")).toBe("30%");
    expect(show({ mode: 2 }, "reconcile")).toBe("54,000");
  });

  it("no split: a majority commit pays a round trip on every write (PACELC)", () => {
    expect(show({}, "commitMs")).toBe("2 ms");
    expect(show({}, "inFlight")).toBe("6");
    expect(show({ rttMs: 65 }, "commitMs")).toBe("66 ms");
    expect(show({ rttMs: 65 }, "inFlight")).toBe("198");
  });
});
