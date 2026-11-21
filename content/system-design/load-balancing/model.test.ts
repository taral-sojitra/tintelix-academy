import { formatOutput } from "@tintelix/schema/format";
import { POLICY, lbModel } from "./model";

const run = (extra: Record<string, number>) => lbModel.run({ ...lbModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("load balancing model", () => {
  it("one server alone is overloaded and drops half the traffic", () => {
    const o = run({ policy: POLICY.single });
    expect(o.serverLoadPct).toBeCloseTo(207, 6);
    expect(o.servedPct).toBeCloseTo(48.31, 2);
    expect(o.overloaded).toBe(1);
  });

  it("round robin: each server is its own line, and heavy requests make lookups wait", () => {
    const o = run({ policy: POLICY.roundRobin });
    expect(o.serverLoadPct).toBeCloseTo(69, 6);
    expect(o.waitMs).toBeCloseTo(72.42, 2);
    expect(show({ policy: POLICY.roundRobin }, "lookupMs")).toBe("82 ms");
    expect(show({ policy: POLICY.roundRobin }, "reportMs")).toBe("272 ms");
    expect(o.servedPct).toBe(100);
  });

  it("least connections: one shared line, so lookups wait far less", () => {
    const o = run({ policy: POLICY.leastConnections });
    expect(o.waitMs).toBeCloseTo(16.72, 1);
    expect(show({ policy: POLICY.leastConnections }, "lookupMs")).toBe("27 ms");
  });

  it("layer 7 by path: reports get their own server and lookups stop waiting behind them", () => {
    const o = run({ policy: POLICY.byPath });
    expect(show({ policy: POLICY.byPath }, "lookupMs")).toBe("16 ms");
    expect(o.reportMs).toBeCloseTo(350, 6);
    expect(o.reportServerLoadPct).toBeCloseTo(60, 6);
  });

  it("gives every policy's lookup time at once, for the comparison panel", () => {
    const o = run({});
    expect(o.rrLookupMs).toBeCloseTo(run({ policy: POLICY.roundRobin }).lookupMs!, 9);
    expect(o.lcLookupMs).toBeCloseTo(run({ policy: POLICY.leastConnections }).lookupMs!, 9);
    expect(o.pathLookupMs).toBeCloseTo(run({ policy: POLICY.byPath }).lookupMs!, 9);
    expect(o.singleServedPct).toBeCloseTo(48.31, 2);
  });

  it("with no heavy requests, round robin and least connections are close", () => {
    const rr = run({ policy: POLICY.roundRobin, heavyPct: 0 }).lookupMs!;
    const lc = run({ policy: POLICY.leastConnections, heavyPct: 0 }).lookupMs!;
    expect(rr - lc).toBeLessThan(15);
  });

  it("stays finite everywhere, overloaded or not", () => {
    for (const policy of Object.values(POLICY)) {
      const ends: Record<string, number>[] = [{ policy }, { policy, traffic: 400 }, { policy, heavyPct: 0 }, { policy, heavyPct: 10 }];
      for (const extra of ends) for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
