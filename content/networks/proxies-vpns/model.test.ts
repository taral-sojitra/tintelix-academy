import { formatOutput } from "@tintelix/schema/format";
import { vpnModel } from "./model";

const run = (extra: Record<string, number> = {}) => vpnModel.run({ ...vpnModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("proxies and VPNs model", () => {
  it("a full tunnel detours web traffic: 70 ms instead of 30", () => {
    expect(show({}, "directMs")).toBe("30 ms");
    expect(show({}, "vpnMs")).toBe("70 ms");
    expect(show({}, "extraMs")).toBe("40 ms");
    expect(show({}, "officeMs")).toBe("42 ms");
  });

  it("a far VPN server makes the detour worse", () => {
    expect(show({ toVpnMs: 200 }, "vpnMs")).toBe("230 ms");
  });

  it("the tunnel costs 60 bytes a packet: 4% of a full frame", () => {
    expect(run().overheadBytes).toBe(60);
    expect(run().innerMtu).toBe(1440);
    expect(show({}, "overheadPct")).toBe("4%");
  });

  it("tells the tunnel widget what to show in each mode", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).tunStage)).toEqual([0, 1, 2, 3, 4]);
  });
});
