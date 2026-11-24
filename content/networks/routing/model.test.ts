import { formatOutput } from "@tintelix/schema/format";
import { routingModel } from "./model";

const run = (extra: Record<string, number> = {}) => routingModel.run({ ...routingModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("routing model", () => {
  it(".200 matches three routes and the /25 wins: via R5, 4 hops, 27 ms", () => {
    const d = run({ mode: 1 });
    expect([d.matchCount, d.chosenPrefix, d.routeIdx]).toEqual([3, 25, 2]);
    expect([d.toR3Pct, d.toR4Pct, d.toR5Pct]).toEqual([0, 0, 100]);
    expect(d.traceHops).toBe(4);
    expect(show({ mode: 1 }, "totalMs")).toBe("27 ms");
  });

  it(".42 matches two and the /24 wins: via R4, 33 ms", () => {
    const d = run({ mode: 1, destD: 42 });
    expect([d.matchCount, d.chosenPrefix, d.routeIdx, d.toR4Pct]).toEqual([2, 24, 1, 100]);
    expect(show({ mode: 1, destD: 42 }, "totalMs")).toBe("33 ms");
  });

  it("anywhere else takes the default route: 5 hops, 121 ms", () => {
    const d = run({ mode: 3 });
    expect([d.destOutside, d.matchCount, d.chosenPrefix, d.routeIdx, d.toR3Pct]).toEqual([1, 1, 0, 0, 100]);
    expect([d.traceHops, d.trace3Ms, d.trace5Ms]).toEqual([5, 22, 121]);
  });

  it("keeps bad inputs in range", () => {
    expect(run({ destD: 300 }).destD).toBe(254);
    expect(run({ destD: Number.NaN }).destD).toBe(200);
  });
});
