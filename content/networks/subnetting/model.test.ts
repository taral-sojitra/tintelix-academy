import { formatOutput } from "@tintelix/schema/format";
import { subnetModel } from "./model";

const run = (extra: Record<string, number> = {}) => subnetModel.run({ ...subnetModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("subnetting model", () => {
  it("shows the block undivided before the split", () => {
    const d = run({ mode: 0 });
    expect([d.subPrefix, d.subnets, d.subnetSize]).toEqual([24, 1, 256]);
    expect(d.samePct).toBe(100);
  });

  it("a /26 is four subnets of 64, 62 for devices, from two borrowed bits", () => {
    const d = run({ mode: 1 });
    expect([d.subPrefix, d.subnets, d.subnetSize, d.usable, d.borrowed]).toEqual([26, 4, 64, 62, 2]);
    expect(run({ mode: 1, subPrefix: 28 }).subnets).toBe(16);
  });

  it("A at .42 and B at .100 sit in different /26s, so the router carries it", () => {
    const d = run({ mode: 2 });
    expect([d.aNet, d.bNet]).toEqual([0, 64]);
    expect([d.samePct, d.diffPct, d.routerHops]).toEqual([0, 100, 1]);
    const near = run({ mode: 2, hostB: 50 });
    expect([near.bNet, near.samePct, near.routerHops]).toEqual([0, 100, 0]);
  });

  it("CIDR gives 2,000 devices a /21 where the old classes gave a /16", () => {
    const d = run({ mode: 3 });
    expect([d.cidrPrefix, d.cidrSize, d.classPrefix, d.classSize]).toEqual([21, 2048, 16, 65536]);
    expect(show({ mode: 3 }, "cidrWastePct")).toBe("2.3%");
    expect(show({ mode: 3 }, "classWastePct")).toBe("97%");
    expect(run({ mode: 3, needHosts: 200 }).classPrefix).toBe(24);
    expect(run({ mode: 3, needHosts: 200 }).cidrPrefix).toBe(24);
    expect(run({ mode: 3, needHosts: 100 }).cidrPrefix).toBe(25);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ mode: 1, subPrefix: 31 }).subPrefix).toBe(30);
    expect(run({ hostB: 300 }).hostB).toBe(254);
    expect(run({ needHosts: Number.NaN }).needHosts).toBe(2000);
  });
});
