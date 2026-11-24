import { formatOutput } from "@tintelix/schema/format";
import { firewallModel } from "./model";

const run = (extra: Record<string, number> = {}) => firewallModel.run({ ...firewallModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("firewall model", () => {
  it("with no firewall every probe reaches a service, the database included", () => {
    const d = run({ mode: 0 });
    expect([d.exposedPorts, d.scanBlockedPct, d.dbOpenPct]).toEqual([3, 0, 100]);
    expect(show({ mode: 0 }, "reachedPerMin")).toBe("300");
  });

  it("rules leave only port 443 open to everyone: two in three probes are dropped", () => {
    const d = run({ mode: 1 });
    expect([d.exposedPorts, d.scanBlockedPct, d.dbOpenPct]).toEqual([1, 100, 0]);
    expect(show({ mode: 1 }, "blockedPerMin")).toBe("200");
  });

  it("a stateless firewall drops replies unless 28,232 ports stay open; a stateful one opens none", () => {
    expect(run({ mode: 1 }).replyBlockedPct).toBe(100);
    expect(show({ mode: 1 }, "statelessHole")).toBe("28,232");
    expect([run({ mode: 2 }).replyBlockedPct, run({ mode: 2 }).statefulHole]).toEqual([0, 0]);
  });

  it("tells the rules widget what to show in each mode", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).fwStage)).toEqual([0, 1, 2, 2, 2]);
  });

  it("scales with the probes", () => {
    expect(show({ mode: 2, probesPerMin: 3000 }, "blockedPerMin")).toBe("2,000");
  });
});
