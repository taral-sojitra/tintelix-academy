import { formatOutput } from "@tintelix/schema/format";
import { indexModel } from "./model";

const run = (extra: Record<string, number>) => indexModel.run({ ...indexModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("index model", () => {
  it("a full scan reads every page", () => {
    expect(show({}, "scanPages")).toBe("100,000");
    expect(show({}, "scanSec")).toBe("10 s");
    expect(show({ rows: 100_000_000 }, "scanSec")).toBe("100 s");
  });

  it("a B+ tree lookup reads a few pages, however big the table", () => {
    const o = run({});
    expect(o.depth).toBe(4);
    expect(o.indexPages).toBe(5);
    expect(show({}, "indexMs")).toBe("0.5 ms");
    expect(show({}, "speedup")).toBe("20,000");
    expect(run({ rows: 1_000_000 }).depth).toBe(3);
    expect(run({ rows: 1_000_000_000 }).depth).toBe(5);
  });

  it("a range descends once, walks the leaves, then fetches each row unless the index covers it", () => {
    const o = run({});
    expect(o.rangeLeaves).toBe(10);
    expect(o.rangePages).toBe(1014);
    expect(show({}, "rangeMs")).toBe("101 ms");
    expect(show({}, "coverMs")).toBe("1 ms");
  });

  it("every index taxes every insert (§42.7)", () => {
    expect(show({ secondary: 0 }, "insertRate")).toBe("20,000");
    expect(show({ secondary: 1 }, "insertRate")).toBe("10,000");
    expect(show({ secondary: 2 }, "insertRate")).toBe("6,667");
    expect(show({ secondary: 4 }, "insertRate")).toBe("4,000");
    expect(show({ secondary: 4 }, "insertsDropPct")).toBe("80%");
    expect(run({ secondary: 4 }).trees).toBe(5);
  });
});
