import { formatOutput } from "@tintelix/schema/format";
import { natModel } from "./model";

const run = (extra: Record<string, number> = {}) => natModel.run({ ...natModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("NAT model", () => {
  it("20 devices with 40 connections each need 800 entries: 1.2% of the ports", () => {
    expect(run().natEntries).toBe(800);
    expect(show({}, "natPorts")).toBe("64,512");
    expect(show({}, "portsUsedPct")).toBe("1.2%");
    expect(show({}, "maxDevices")).toBe("1,613");
  });

  it("the ISP's NAT gives each home 2,000 ports, so 32 homes share an address", () => {
    expect(run().homesPerIp).toBe(32);
    expect(show({ connsPerDevice: 200 }, "homePortsUsedPct")).toBe("100%");
    expect(show({}, "homePortsUsedPct")).toBe("40%");
  });

  it("drops every unasked packet from outside", () => {
    expect(run().blockedPct).toBe(100);
  });

  it("tells the NAT table what to show in each mode", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).natStage)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ devices: 0 }).devices).toBe(1);
    expect(run({ connsPerDevice: Number.NaN }).connsPerDevice).toBe(40);
  });
});
