import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { describeIndexes, describeTable } from "./ddl";
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

describe("describeIndexes", () => {
  it("compares indexes by their keys, not their names", async () => {
    const a = await rowsOf("CREATE INDEX one ON orders (customer_id, ordered_at)", describeIndexes("orders"));
    const b = await rowsOf("CREATE INDEX another_name ON orders (customer_id, ordered_at)", describeIndexes("orders"));
    expect(b).toEqual(a);
    expect(a).toEqual([["customer_id, ordered_at", false, false]]);
    expect(await rowsOf("CREATE UNIQUE INDEX e ON customers (lower(email))", describeIndexes("customers"))).toContainEqual(["lower(email)", true, false]);
  });
});

describe("CREATE INDEX replay", () => {
  it("shows the table as stored, then the index's sorted entries", async () => {
    const r = await buildReplay(db, "CREATE INDEX customers_city ON customers (city)");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.map((f) => f.clause)).toEqual(["BEFORE", "CREATE INDEX"]);
    expect(r.frames[0]!.note).toBe("Without an index, a WHERE on city reads all 20 rows of customers to find its matches.");
    const idx = r.frames[1]!;
    expect(idx.columns).toEqual(["city", "row (id)"]);
    expect(idx.total).toBe(20);
    const cities = idx.rows.map((x) => x[0]).filter((c) => c !== null) as string[];
    expect(cities).toEqual([...cities].sort());
    expect(idx.note).toBe("CREATE INDEX keeps city sorted, each entry pointing at its row: 20 entries. A WHERE on city can jump to its matches instead of reading every row.");
  });
});

describe("DROP TABLE replay", () => {
  it("shows what's dropped, and what CASCADE takes with it", async () => {
    const r = await buildReplay(db, "CREATE TABLE coupons (code text PRIMARY KEY, percent_off integer);\nCREATE VIEW big_coupons AS SELECT code FROM coupons WHERE percent_off >= 15;\nDROP TABLE coupons CASCADE;");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.map((f) => f.clause)).toEqual(["BEFORE", "DROP TABLE"]);
    expect(r.frames[0]!.columns).toEqual(["name", "kind", "rows", "points at"]);
    expect(r.frames[0]!.marks?.filter((m) => m === "gone")).toHaveLength(2);
    expect(r.frames[1]!.note).toBe("DROP TABLE removed coupons. CASCADE also removed the view big_coupons, which depended on it.");
  });

  it("says which links CASCADE removed from tables that stay", async () => {
    const r = await buildReplay(db, "DROP TABLE products CASCADE");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames[1]!.note).toBe("DROP TABLE removed products. CASCADE also removed the link from order_items to products; order_items stays.");
  });
});

describe("DROP VIEW and IF EXISTS", () => {
  it("replays DROP VIEW", async () => {
    const r = await buildReplay(db, "CREATE VIEW v AS SELECT id FROM orders;\nDROP VIEW v;");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames[1]!.note).toBe("DROP VIEW removed v.");
  });
  it("says when IF EXISTS found nothing", async () => {
    const r = await buildReplay(db, "DROP TABLE IF EXISTS promotions");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames[1]!.note).toBe("DROP TABLE found nothing called promotions, so nothing changed.");
  });
});

describe("dependents in the refusal", () => {
  it("names what depends on the table", async () => {
    const r = await runInRollback(db, "CREATE TABLE coupons (code text);\nCREATE VIEW v AS SELECT code FROM coupons;\nDROP TABLE coupons;");
    expect(r.outcome.ok).toBe(false);
    if (!r.outcome.ok) expect(r.outcome.message).toBe("Other things depend on coupons (view v depends on table coupons). Add CASCADE to drop them too, or drop them first.");
  });
});

describe("TRUNCATE replay", () => {
  it("shows every row going at once while the table stays", async () => {
    const r = await buildReplay(db, "TRUNCATE order_items");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.map((f) => f.clause)).toEqual(["BEFORE", "TRUNCATE"]);
    expect(r.frames[0]!.marks?.every((m) => m === "gone")).toBe(true);
    expect(r.frames[1]!.total).toBe(0);
    expect(r.frames[1]!.columns).toEqual(["order_id", "product_id", "quantity", "unit_price"]);
    expect(r.frames[1]!.note).toBe("TRUNCATE emptied order_items in one go: 150 rows gone. The table and its columns stay.");
  });

  it("says what CASCADE also emptied", async () => {
    const r = await buildReplay(db, "TRUNCATE orders CASCADE");
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames[1]!.note).toBe("TRUNCATE emptied orders in one go: 60 rows gone. The table and its columns stay. CASCADE also emptied order_items, which points at it.");
  });

  it("explains the refusal when other tables point at it", async () => {
    const r = await runInRollback(db, "TRUNCATE orders");
    expect(r.outcome.ok).toBe(false);
    if (!r.outcome.ok) expect(r.outcome.message).toBe("order_items points at orders, so orders can't be emptied on its own. Empty both in the same TRUNCATE, or add CASCADE.");
  });
});
