import { describe, expect, it } from "vitest";
import { compareResults, normalise, type ResultSet } from "./compare";

const rs = (columns: string[], rows: unknown[][]): ResultSet => ({ columns, rows });

describe("normalise", () => {
  it("treats numbers and Postgres numeric strings alike", () => {
    expect(normalise("2499.00")).toBe(normalise(2499));
    expect(normalise("2499.50")).toBe("2499.5");
    expect(normalise(0.1 + 0.2)).toBe(normalise("0.3"));
  });
  it("reads dates, NULLs and booleans", () => {
    expect(normalise(new Date("2026-03-05T00:00:00Z"))).toBe("2026-03-05");
    expect(normalise(null)).toBe("NULL");
    expect(normalise(undefined)).toBe("NULL");
    expect(normalise(true)).toBe("true");
  });
});

describe("compareResults", () => {
  const answer = rs(["name", "price"], [["Mat", "1199.00"], ["Rope", "499.00"], ["Rope", "499.00"]]);

  it("accepts the same rows in any order when order doesn't matter", () => {
    expect(compareResults(answer, rs(["n", "p"], [["Rope", 499], ["Mat", 1199], ["Rope", 499]]), { ordered: false })).toEqual({ ok: true });
  });
  it("reports a different number of columns first", () => {
    const f = compareResults(answer, rs(["name"], [["Mat"], ["Rope"], ["Rope"]]), { ordered: false });
    expect(f).toMatchObject({ ok: false, kind: "columns" });
    if (!f.ok) expect(f.message).toBe("Your result has 1 column; this task wants 2.");
  });
  it("spots the right values in the wrong column order", () => {
    const f = compareResults(answer, rs(["price", "name"], [["1199.00", "Mat"], ["499.00", "Rope"], ["499.00", "Rope"]]), { ordered: false });
    expect(f).toMatchObject({ ok: false, kind: "columns" });
    if (!f.ok) expect(f.message).toBe("Right values, but the columns are in a different order. This task wants them as: name, price.");
  });
  it("checks column names only when the task names them", () => {
    const right = rs(["name", "amount"], [["Mat", 1199], ["Rope", 499], ["Rope", 499]]);
    expect(compareResults(answer, right, { ordered: false })).toEqual({ ok: true });
    const f = compareResults(answer, rs(["name", "price"], answer.rows), { ordered: false, namedColumns: ["name", "amount"] });
    expect(f).toMatchObject({ ok: false, kind: "columns" });
    if (!f.ok) expect(f.message).toBe("Name the columns name, amount. Yours are called name, price.");
  });
  it("counts duplicates when comparing rows, showing up to three of each", () => {
    const f = compareResults(answer, rs(["n", "p"], [["Mat", 1199], ["Rope", 499]]), { ordered: false });
    expect(f).toMatchObject({ ok: false, kind: "rows", missing: [["Rope", "499.00"]], extra: [] });
    const many = rs(["x"], [[1], [2], [3], [4], [5]]);
    const g = compareResults(many, rs(["x"], [[6], [7], [8], [9]]), { ordered: false });
    if (!g.ok) {
      expect(g.missing).toHaveLength(3);
      expect(g.extra).toHaveLength(3);
      expect(g.message).toBe("Your query returned 4 rows; the answer has 5. 5 rows are missing and 4 shouldn't be there.");
    }
  });
  it("says where each row should be when only the order is wrong", () => {
    const want = rs(["x"], [[1], [2], [3]]);
    const f = compareResults(want, rs(["x"], [[3], [1], [2]]), { ordered: true });
    expect(f).toMatchObject({ ok: false, kind: "order", shouldBe: [3, 1, 2] });
    expect(compareResults(want, rs(["x"], [[3], [1], [2]]), { ordered: false })).toEqual({ ok: true });
  });
});
