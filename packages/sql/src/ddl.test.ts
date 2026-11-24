import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { describeTable } from "./ddl";
import { buildReplay } from "./frames";
import { runInRollback } from "./run";
import { openShop } from "./seed";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

const rowsOf = async (sql: string, verify: string) => {
  const r = await runInRollback(db, sql, verify);
  if (!r.after?.ok) throw new Error(r.after && !r.after.ok ? r.after.message : "no verify");
  return r.after.result.rows;
};

describe("describeTable", () => {
  it("compares rules by kind, however they're written", async () => {
    const a = await rowsOf("CREATE TABLE r (id serial PRIMARY KEY, stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5))", describeTable("r"));
    const b = await rowsOf("CREATE TABLE r (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, stars int NOT NULL, CHECK (stars >= 1 AND stars <= 5))", describeTable("r"));
    expect(b).toEqual(a);
    expect(a).toEqual([["id", "integer", true, "p"], ["stars", "integer", true, "c"]]);
  });
});

describe("CREATE TABLE replay", () => {
  it("lists the new table's columns and rules", async () => {
    const r = await buildReplay(db, "CREATE TABLE reviews (id serial PRIMARY KEY, product_id integer NOT NULL REFERENCES products(id), stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5), body text DEFAULT '')");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.map((f) => f.clause)).toEqual(["CREATE TABLE"]);
    const f = r.frames[0]!;
    expect(f.note).toBe("CREATE TABLE made reviews with 4 columns and no rows yet.");
    expect(f.columns).toEqual(["column", "type", "rules"]);
    expect(f.rows).toEqual([
      ["id", "integer", "PRIMARY KEY, counts up by itself"],
      ["product_id", "integer", "NOT NULL, REFERENCES products(id)"],
      ["stars", "integer", "NOT NULL, CHECK ((stars >= 1) AND (stars <= 5))"],
      ["body", "text", "DEFAULT ''"],
    ]);
  });
});

describe("ALTER TABLE replay", () => {
  it("shows the columns before and after, and what the rows got", async () => {
    const r = await buildReplay(db, "ALTER TABLE products ADD COLUMN discount numeric(5,2) NOT NULL DEFAULT 0");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.map((f) => f.clause)).toEqual(["BEFORE", "ALTER TABLE", "AFTER"]);
    expect(r.frames[0]!.note).toBe("products has 5 columns and 15 rows.");
    const alter = r.frames[1]!;
    expect(alter.note).toBe("ALTER TABLE added discount to products.");
    expect(alter.marks).toEqual(["plain", "plain", "plain", "plain", "plain", "new"]);
    expect(r.frames[2]!.note).toBe("All 15 rows got discount = 0.00.");
    expect(r.frames[2]!.columns).toContain("discount");
  });

  it("marks dropped and renamed columns", async () => {
    const r = await buildReplay(db, "ALTER TABLE orders DROP COLUMN coupon");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames[0]!.marks?.[5]).toBe("gone");
    expect(r.frames[1]!.note).toBe("ALTER TABLE dropped coupon from orders.");
    const n = await buildReplay(db, "ALTER TABLE customers ADD COLUMN points integer");
    if (!n.supported) throw new Error(n.reason);
    expect(n.frames[2]!.note).toBe("All 20 rows have NULL in points, because it has no default.");
  });
});
