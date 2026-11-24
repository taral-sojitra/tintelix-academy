import { formatOutput } from "@tintelix/schema/format";
import { dhcpModel } from "./model";

const run = (extra: Record<string, number> = {}) => dhcpModel.run({ ...dhcpModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("DHCP model", () => {
  it("a 4-hour lease renews at 2 hours", () => {
    expect(run().renewHours).toBe(2);
    expect(run().messages).toBe(4);
  });

  it("300 café visitors a day on 4-hour leases hold 50 of 100 addresses", () => {
    const d = run();
    expect(d.held).toBe(50);
    expect(show({}, "poolUsedPct")).toBe("50%");
    expect(d.failPct).toBe(0);
  });

  it("day-long leases run the pool dry: two in three newcomers get nothing", () => {
    const d = run({ leaseHours: 24 });
    expect(d.held).toBe(300);
    expect(show({ leaseHours: 24 }, "poolUsedPct")).toBe("100%");
    expect(show({ leaseHours: 24 }, "failPct")).toBe("67%");
  });

  it("tells the widget what to show in each mode", () => {
    expect([0, 1, 2, 3].map((mode) => run({ mode }).dhcpStage)).toEqual([0, 1, 2, 2]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ leaseHours: 0 }).leaseHours).toBe(0.5);
    expect(run({ visitorsPerDay: -1 }).held).toBe(0);
    expect(run({ leaseHours: Number.NaN }).leaseHours).toBe(4);
  });
});
