import { formatOutput } from "@tintelix/schema/format";
import { healthModel } from "./model";

const run = (extra: Record<string, number>) => healthModel.run({ ...healthModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("health-check model", () => {
  it("without checks, a dead server keeps its share and those requests fail", () => {
    const o = run({ checks: 0 });
    expect(o.perServer).toBe(80);
    expect(o.inRotation).toBe(10);
    expect(show({ checks: 0 }, "failedPct")).toBe("10%");
    expect(o.failedPerSec).toBeCloseTo(80, 9);
  });

  it("checks eject the dead server after interval × threshold, losing only that window's share", () => {
    const o = run({});
    expect(show({}, "detectSec")).toBe("10 s");
    expect(o.lostBefore).toBe(800);
    expect(o.inRotation).toBe(9);
    expect(show({}, "failedPct")).toBe("0%");
    expect(show({}, "loadEach")).toBe("89");
  });

  it("follows the clock: still failing before detection, clean after", () => {
    expect(show({ elapsedSec: 9 }, "failedPct")).toBe("10%");
    expect(run({ elapsedSec: 10 }).inRotation).toBe(9);
    expect(show({ intervalSec: 1, elapsedSec: 3 }, "failedPct")).toBe("0%");
  });

  it("near capacity, ejecting one stalled server cascades until none are left", () => {
    const peak = { rps: 1000, fault: 1 };
    expect(show(peak, "afterOneLoad")).toBe("111");
    expect(show({ ...peak, elapsedSec: 5 }, "servedPct")).toBe("90%");
    expect(show({ ...peak, elapsedSec: 15 }, "servedPct")).toBe("99%");
    expect(run({ ...peak, elapsedSec: 15 }).inRotation).toBe(9);
    const end = run(peak);
    expect(end.inRotation).toBe(0);
    expect(end.ejected).toBe(10);
    expect(show(peak, "servedPct")).toBe("0%");
    expect(show(peak, "cascadeSec")).toBe("20 s");
  });

  it("an ejection cap keeps the rest serving", () => {
    const capped = { rps: 1000, fault: 1, maxEjectPct: 10 };
    expect(run(capped).inRotation).toBe(9);
    expect(show(capped, "servedPct")).toBe("99%");
    expect(show({ ...capped, maxEjectPct: 20 }, "servedPct")).toBe("88%");
    expect(show({ ...capped, maxEjectPct: 50 }, "servedPct")).toBe("55%");
  });
});
