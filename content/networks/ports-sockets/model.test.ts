import { formatOutput } from "@tintelix/schema/format";
import { portsModel } from "./model";

const run = (extra: Record<string, number> = {}) => portsModel.run({ ...portsModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("ports and sockets model", () => {
  it("16-bit ports: 65,536 of them, 1,024 well known, 28,232 for clients", () => {
    expect(show({}, "totalPorts")).toBe("65,536");
    expect(run().wellKnown).toBe(1024);
    expect(show({}, "ephemeralPorts")).toBe("28,232");
  });

  it("200 new connections a second keep 12,000 ports in TIME_WAIT: 43% used", () => {
    expect(show({}, "portsInUse")).toBe("12,000");
    expect(show({}, "portsUsedPct")).toBe("43%");
    expect(run().failPct).toBe(0);
    expect(show({}, "maxRate")).toBe("471");
  });

  it("1,000 a second needs 60,000 ports: about half the new connections fail", () => {
    expect(show({ connsPerSec: 1000 }, "portsUsedPct")).toBe("100%");
    expect(show({ connsPerSec: 1000 }, "failPct")).toBe("53%");
  });

  it("tells the socket table what to show in each mode", () => {
    expect([0, 1, 2, 3].map((mode) => run({ mode }).sockStage)).toEqual([0, 0, 1, 2]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ connsPerSec: -5 }).portsInUse).toBe(0);
    expect(run({ timeWaitSec: 0 }).timeWaitSec).toBe(1);
  });
});
