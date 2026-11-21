import { formatOutput } from "@tintelix/schema/format";
import { ringModel } from "./model";

const run = (extra: Record<string, number>) => ringModel.run({ ...ringModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("consistent hashing model", () => {
  it("hash mod N: adding a fifth server moves four keys in five (§45.4)", () => {
    expect(show({}, "movedPct")).toBe("80%");
    expect(show({}, "movedKeys")).toBe("800,000");
    expect(show({ servers: 5 }, "movedPct")).toBe("83%");
  });

  it("a ring: the new server takes one arc, about one key in five", () => {
    expect(show({ scheme: 1 }, "movedPct")).toBe("19%");
    const moved = run({ scheme: 1 }).movedKeys;
    expect(moved).toBeGreaterThan(150_000);
    expect(moved).toBeLessThan(250_000);
  });

  it("one point per server makes uneven arcs; virtual nodes even them out", () => {
    expect(show({ scheme: 1 }, "fairPct")).toBe("20%");
    expect(show({ scheme: 1 }, "maxSharePct")).toBe("36%");
    expect(show({ scheme: 1, vnodes: 100 }, "maxSharePct")).toBe("22%");
  });

  it("the moved keys miss once, after the new server joins", () => {
    expect(run({ elapsedSec: 1 }).missPct).toBe(0);
    expect(run({ elapsedSec: 1 }).joined).toBe(0);
    expect(show({ elapsedSec: 3 }, "missPct")).toBe("80%");
    expect(show({ scheme: 1, elapsedSec: 3 }, "missPct")).toBe("19%");
    expect(run({ elapsedSec: 8 }).missPct).toBe(0);
  });
});
