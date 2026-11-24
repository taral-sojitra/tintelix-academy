import { formatOutput } from "@tintelix/schema/format";
import { kvModel } from "./model";

const run = (extra: Record<string, number> = {}) => kvModel.run({ ...kvModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("key-value store model", () => {
  it("sizes the ring: 5 nodes with one copy, 15 with three", () => {
    expect(show({}, "nodesSingle")).toBe("5");
    expect(show({}, "sliceTb")).toBe("2");
    expect(show({}, "nodes")).toBe("15");
    expect(show({}, "trafficRate")).toBe("120,000");
  });

  it("with one copy, a dead node takes a fifth of the keys with it", () => {
    expect(show({ mode: 1 }, "downKeysPct")).toBe("20%");
    expect(show({ mode: 1 }, "aDownPct")).toBe("100%");
    expect(show({ mode: 2 }, "aDownPct")).toBe("0%");
  });

  it("W and R trade speed against fresh reads", () => {
    expect(show({ mode: 2 }, "writeLatencyMs")).toBe("6 ms");
    expect(show({ mode: 2 }, "readLatencyMs")).toBe("6 ms");
    expect(show({ mode: 2 }, "staleReadPct")).toBe("0%");
    expect(show({ mode: 2, writeQuorum: 1 }, "writeLatencyMs")).toBe("4 ms");
    expect(show({ mode: 2, writeQuorum: 3 }, "writeLatencyMs")).toBe("40 ms");
    expect(show({ mode: 2, writeQuorum: 1, readQuorum: 1 }, "staleReadPct")).toBe("67%");
    expect(show({ mode: 2, writeQuorum: 1, readQuorum: 2 }, "staleReadPct")).toBe("33%");
  });

  it("with a replica down, W = 2 keeps taking writes and a neighbour holds hints", () => {
    expect(show({ mode: 3 }, "bDownPct")).toBe("100%");
    expect(show({ mode: 3 }, "writeOkPct")).toBe("100%");
    expect(show({ mode: 3, writeQuorum: 3 }, "writeOkPct")).toBe("0%");
    expect(show({ mode: 3 }, "hintRate")).toBe("4,000");
    expect(show({ mode: 3, elapsedSec: 3 }, "hintsHeld")).toBe("12,000");
    expect(show({ mode: 2 }, "hintsHeld")).toBe("0");
  });

  it("concurrent writes become siblings, then one merged version", () => {
    expect(show({ mode: 4, elapsedSec: 1 }, "vcPhase")).toBe("0");
    expect(show({ mode: 4, elapsedSec: 3 }, "vcPhase")).toBe("1");
    expect(show({ mode: 4, elapsedSec: 6 }, "siblings")).toBe("2");
    expect(show({ mode: 4, elapsedSec: 9 }, "siblings")).toBe("1");
    expect(show({ mode: 4, elapsedSec: 9 }, "vcPhase")).toBe("3");
  });

  it("guards against nonsense inputs", () => {
    const out = run({ dataTb: -1, nodeTb: 0, writeQuorum: 9, readQuorum: Number.NaN, replicas: 0 });
    for (const v of Object.values(out)) expect(Number.isFinite(v)).toBe(true);
  });
});
