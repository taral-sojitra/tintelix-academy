import { formatOutput } from "@tintelix/schema/format";
import { tcpUdpModel } from "./model";

const run = (extra: Record<string, number> = {}) => tcpUdpModel.run({ ...tcpUdpModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("TCP vs UDP model", () => {
  it("loses nothing while the lesson sets the scene", () => {
    expect(run({ mode: 0 }).lossPct).toBe(0);
    expect(run({ mode: 0 }).udpDeliveredPct).toBe(100);
  });

  it("at 2% loss TCP still delivers everything and UDP delivers 98%", () => {
    const d = run({ mode: 1 });
    expect(d.tcpDeliveredPct).toBe(100);
    expect(d.udpDeliveredPct).toBe(98);
    expect(d.resendPct).toBe(2);
  });

  it("each loss stalls TCP for 1.5 round trips, freezing a call 12% of the time", () => {
    expect(show({ mode: 2 }, "stallMs")).toBe("120 ms");
    expect(show({ mode: 2 }, "tcpFrozenPct")).toBe("12%");
    expect(show({ mode: 2 }, "udpGapPct")).toBe("2%");
    expect(show({ mode: 2, rttMs: 200 }, "tcpFrozenPct")).toBe("30%");
    expect(show({ mode: 2, lossPct: 20, rttMs: 300 }, "tcpFrozenPct")).toBe("100%");
  });

  it("UDP's header is 8 bytes to TCP's 20", () => {
    expect([run().tcpHeader, run().udpHeader]).toEqual([20, 8]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ mode: 1, lossPct: 80 }).lossPct).toBe(30);
    expect(run({ rttMs: -1 }).rttMs).toBe(1);
    expect(run({ lossPct: Number.NaN, mode: 1 }).lossPct).toBe(2);
  });
});
