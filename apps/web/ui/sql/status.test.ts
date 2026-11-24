import { describe, expect, it } from "vitest";
import { runStatus } from "./status";

const ran = (command: string, columns: string[], rowCount: number) => ({ run: { ok: true as const, result: { columns, rows: [] }, command, rowCount, ms: 2.4 }, feedback: { ok: true as const } });

describe("runStatus", () => {
  it("counts rows for a query and changed rows for a change", () => {
    expect(runStatus(ran("SELECT", ["n"], 12), false, true)).toBe("12 rows · 2 ms · runs in your browser");
    expect(runStatus(ran("UPDATE", [], 1), false, true)).toBe("UPDATE · 1 row changed · 2 ms · runs in your browser");
  });
  it("doesn't claim rows changed for a statement that defines tables", () => {
    expect(runStatus(ran("ALTER", [], 0), false, true)).toBe("ALTER ran · 2 ms · runs in your browser");
    expect(runStatus(ran("TRUNCATE", [], 0), false, true)).toBe("TRUNCATE ran · 2 ms · runs in your browser");
  });
  it("says when Postgres is still starting", () => {
    expect(runStatus(null, true, false)).toBe("Starting Postgres in your browser…");
  });
});
