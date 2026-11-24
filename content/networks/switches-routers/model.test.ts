import { formatOutput } from "@tintelix/schema/format";
import { switchModel } from "./model";

const run = (extra: Record<string, number> = {}) => switchModel.run({ ...switchModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("switches vs routers model", () => {
  it("a 24-port hub copies every frame 23 times; a switch once", () => {
    const d = run();
    expect([d.hubCopies, d.switchCopies]).toEqual([23, 1]);
    expect(show({}, "wastedPct")).toBe("96%");
  });

  it("a hub's waste grows with the ports", () => {
    expect(show({ devices: 4 }, "wastedPct")).toBe("67%");
    expect(run({ devices: 2 }).wastedPct).toBe(0);
  });

  it("crossing to another network takes one router hop and one TTL", () => {
    expect([run().routerHops, run().ttlDrop]).toEqual([1, 1]);
  });

  it("tells the MAC table what to show in each mode", () => {
    expect([0, 1, 2, 3, 4].map((mode) => run({ mode }).macStage)).toEqual([0, 1, 2, 3, 3]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ devices: 1 }).devices).toBe(2);
    expect(run({ devices: Number.NaN }).devices).toBe(24);
  });
});
