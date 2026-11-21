import { formatOutput } from "@tintelix/schema/format";
import { dataModel } from "./model";

const run = (extra: Record<string, number>) => dataModel.run({ ...dataModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("SQL vs NoSQL model", () => {
  it("showing one order: a three-table join against one document read", () => {
    const o = run({});
    expect(o.sqlRows).toBe(7);
    expect(o.sqlTables).toBe(3);
    expect(o.joins).toBe(2);
    expect(o.docReads).toBe(1);
  });

  it("a seller rename: one row against every listing that embeds the name", () => {
    const o = run({});
    expect(o.sqlRenameRows).toBe(1);
    expect(show({}, "renameDocs")).toBe("20,000");
    expect(show({}, "renameSec")).toBe("10 s");
    expect(show({ listings: 50000 }, "renameSec")).toBe("25 s");
  });

  it("follows the rewrite as it plays", () => {
    expect(show({ elapsedSec: 5 }, "renameDonePct")).toBe("50%");
    expect(show({ elapsedSec: 5 }, "docsLeft")).toBe("10,000");
    expect(run({}).docsLeft).toBe(0);
  });

  it("a flexible schema stores the bad writes a constraint would reject", () => {
    expect(show({}, "badPerDay")).toBe("500");
    expect(show({}, "badPct")).toBe("5%");
  });
});
