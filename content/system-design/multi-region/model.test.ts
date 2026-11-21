import { formatOutput } from "@tintelix/schema/format";
import { regionModel } from "./model";

const run = (extra: Record<string, number>) => regionModel.run({ ...regionModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("multi-region model", () => {
  it("active-passive: US users cross the ocean; the standby trails by half a round trip plus apply (§97.3)", () => {
    expect(show({}, "usRttMs")).toBe("193 ms");
    expect(show({}, "indiaRttMs")).toBe("10 ms");
    expect(show({}, "lagMs")).toBe("172 ms");
    expect(show({}, "standbyServesPct")).toBe("0%");
    expect(show({}, "acceptedRate")).toBe("2,000");
  });

  it("active-passive failover: 3 checks × 10 s, promote, then DNS (§97.6)", () => {
    const s = { mode: 1 };
    expect(show(s, "detectSec")).toBe("30 s");
    expect(show(s, "writesDowntime")).toBe("90 s");
    expect(show(s, "cutoverDowntime")).toBe("2.5 min");
    expect(show(s, "lostWrites")).toBe("343");
    // The timeline runs 10× fast and the region dies 1 s into the step.
    const at = (t: number) => run({ mode: 1, elapsedSec: t });
    expect(at(0.5)).toMatchObject({ phase: 0, mumbaiUp: 1, acceptedRate: 2000 });
    expect(at(3)).toMatchObject({ phase: 1, realSec: 20, mumbaiUp: 0, acceptedRate: 0, failedPct: 100 });
    expect(at(7)).toMatchObject({ phase: 2, primary: 0, acceptedRate: 0 });
    expect(at(13)).toMatchObject({ phase: 3, primary: 1, movedPct: 50, acceptedRate: 1000, failedPct: 50 });
    expect(at(20)).toMatchObject({ phase: 4, movedPct: 100, failedPct: 0 });
    expect(show({ mode: 1, elapsedSec: 20 }, "indiaRttMs")).toBe("193 ms");
    expect(show({ mode: 1, elapsedSec: 20 }, "usRttMs")).toBe("10 ms");
  });

  it("a longer DNS TTL stretches the tail, not the write outage", () => {
    expect(show({ mode: 1, dnsTtlSec: 300 }, "writesDowntime")).toBe("90 s");
    expect(show({ mode: 1, dnsTtlSec: 300 }, "cutoverDowntime")).toBe("6.5 min");
  });

  it("active-active: each group stays local, writes go both ways (§97.2)", () => {
    const s = { mode: 2 };
    expect(show(s, "usRttMs")).toBe("10 ms");
    expect(show(s, "indiaRttMs")).toBe("10 ms");
    expect(show(s, "regionRate")).toBe("1,000");
    expect(show(s, "standbyServesPct")).toBe("100%");
  });

  it("active-active failover: no promotion; US users never notice; India moves after detect + TTL", () => {
    const s = { mode: 3 };
    expect(show(s, "indiaDowntime")).toBe("90 s");
    expect(show(s, "usDowntime")).toBe("0 s");
    expect(show(s, "lostWrites")).toBe("172");
    const at = (t: number) => run({ mode: 3, elapsedSec: t });
    expect(at(3)).toMatchObject({ phase: 1, acceptedRate: 1000, failedPct: 50 });
    expect(at(7)).toMatchObject({ phase: 2, movedPct: 50, acceptedRate: 1500, failedPct: 25 });
    expect(at(11)).toMatchObject({ phase: 3, movedPct: 100, acceptedRate: 2000, failedPct: 0 });
  });

  it("lag: a read in Virginia right after a write in Mumbai sees the old value (§97.3)", () => {
    const at = (t: number) => run({ mode: 4, elapsedSec: t });
    expect(at(0.5)).toMatchObject({ mumbaiV: 1, virginiaV: 1, staleRead: 0 });
    expect(at(1.5)).toMatchObject({ mumbaiV: 2, virginiaV: 1, staleRead: 1 });
    expect(at(3)).toMatchObject({ mumbaiV: 2, virginiaV: 2, staleRead: 0 });
  });
});
