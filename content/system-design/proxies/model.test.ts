import { formatOutput } from "@tintelix/schema/format";
import { proxyModel } from "./model";

const run = (extra: Record<string, number>) => proxyModel.run({ ...proxyModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("proxy model", () => {
  it("a forward proxy fetches the office's update once", () => {
    const o = run({});
    expect(o.officeGb).toBe(100);
    expect(o.proxyGb).toBeCloseTo(0.2, 9);
    expect(show({}, "savedPct")).toBe("99.8%");
  });

  it("without buffering, slow phones hold a worker for their whole download", () => {
    const o = run({});
    expect(o.holdMs).toBeCloseTo(334, 9);
    expect(o.busyWorkers).toBeCloseTo(133.6, 9);
    expect(show({}, "servedPct")).toBe("75%");
    expect(show({}, "maxRps")).toBe("299");
  });

  it("with buffering, the proxy takes the response in a millisecond and frees the worker", () => {
    const o = run({ buffering: 1 });
    expect(o.holdMs).toBe(21);
    expect(o.busyWorkers).toBeCloseTo(8.4, 9);
    expect(show({ buffering: 1 }, "workerLoadPct")).toBe("8.4%");
    expect(show({ buffering: 1 }, "maxRps")).toBe("4,762");
    expect(o.servedPct).toBe(100);
  });

  it("stays finite at the slider ends", () => {
    const ends: Record<string, number>[] = [{ slowPct: 0 }, { slowPct: 60 }, { employees: 1 }, { employees: 2000 }, { buffering: 1, slowPct: 60 }];
    for (const extra of ends) for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
  });
});
