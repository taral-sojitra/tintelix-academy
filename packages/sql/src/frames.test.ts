import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalise } from "./compare";
import type { Db } from "./db";
import { buildReplay, type Frame, type Replay } from "./frames";
import { openShop } from "./seed";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

const clauses = (r: Replay) => (r.supported ? r.frames.map((f) => f.clause) : []);
const frame = (r: Replay, clause: string): Frame => {
  if (!r.supported) throw new Error(`not supported: ${r.reason}`);
  const f = r.frames.find((x) => x.clause === clause);
  if (!f) throw new Error(`no ${clause} frame`);
  return f;
};
const count = <T,>(xs: T[] | undefined, v: T) => (xs ?? []).filter((x) => x === v).length;

/** The replay's last frame must be the real result, row for row. */
async function endsOnRealResult(sql: string, r: Replay) {
  if (!r.supported) throw new Error(r.reason);
  const real = await db.query(sql);
  const last = r.frames[r.frames.length - 1]!;
  expect(last.rows.map((row) => row.map(normalise))).toEqual(real.rows.map((row) => row.map(normalise)));
  expect(last.total).toBe(real.rows.length);
}

describe("buildReplay", () => {
  it("shows the whole table, then the columns SELECT picked", async () => {
    const sql = "SELECT name, city FROM customers";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "SELECT"]);
    const from = frame(r, "FROM");
    expect(from.columns).toEqual(["id", "name", "email", "city", "country", "signed_up"]);
    expect(from.total).toBe(20);
    expect(frame(r, "SELECT")).toMatchObject({ columns: ["name", "city"], picked: ["name", "city"] });
    await endsOnRealResult(sql, r);
  });

  it("marks the rows WHERE keeps, and calls out NULLs", async () => {
    const sql = "SELECT name FROM customers WHERE city = 'Pune'";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "WHERE", "SELECT"]);
    const where = frame(r, "WHERE");
    expect(where.rows).toHaveLength(20);
    expect(count(where.marks, "pass")).toBe(2);
    expect(count(where.marks, "unknown")).toBe(4);
    expect(where.note).toBe("WHERE kept 2 of 20 rows. 4 hit a NULL, which is never equal to anything, so they were dropped too.");
    await endsOnRealResult(sql, r);
  });

  it("puts rows into GROUP BY buckets, then one row per group", async () => {
    const sql = "SELECT customer_id, sum(total) FROM orders GROUP BY customer_id";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "GROUP BY", "SELECT"]);
    const g = frame(r, "GROUP BY");
    expect(g.groups).toHaveLength(60);
    const buyers = Number((await db.query("SELECT count(DISTINCT customer_id) FROM orders")).rows[0]?.[0]);
    expect(new Set(g.groups).size).toBe(buyers);
    expect(g.groups).toEqual([...g.groups!].sort((a, b) => a - b));
    expect(g.columns).toEqual(["customer_id", "total"]);
    expect(g.note).toBe(`GROUP BY put the 60 rows into ${buyers} groups, one per customer_id.`);
    expect(frame(r, "SELECT").total).toBe(buyers);
    await endsOnRealResult(sql, r);
  });

  it("follows GROUP BY by position too", async () => {
    const r = await buildReplay(db, "SELECT status, count(*) FROM orders GROUP BY 1");
    expect(new Set(frame(r, "GROUP BY").groups).size).toBe(4);
  });

  it("marks the groups HAVING keeps", async () => {
    const sql = "SELECT customer_id, count(*) AS orders FROM orders GROUP BY customer_id HAVING count(*) >= 4";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "GROUP BY", "HAVING", "SELECT"]);
    const h = frame(r, "HAVING");
    expect(h.rows).toHaveLength(Number((await db.query("SELECT count(DISTINCT customer_id) FROM orders")).rows[0]?.[0]));
    expect(frame(r, "SELECT").total).toBe(count(h.marks, "pass"));
    await endsOnRealResult(sql, r);
  });

  it("sorts, then keeps the first rows", async () => {
    const sql = "SELECT name, price FROM products ORDER BY price DESC, id LIMIT 5";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "SELECT", "ORDER BY", "LIMIT"]);
    expect(frame(r, "ORDER BY").total).toBe(15);
    expect(frame(r, "LIMIT").note).toBe("LIMIT kept the first 5 of 15 rows.");
    await endsOnRealResult(sql, r);
  });

  it("removes duplicates with DISTINCT", async () => {
    const sql = "SELECT DISTINCT category FROM products";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "SELECT", "DISTINCT"]);
    expect(frame(r, "DISTINCT").note).toBe("DISTINCT removed 11 duplicate rows, leaving 4.");
    await endsOnRealResult(sql, r);
  });

  it("folds every row into one for a summary without GROUP BY", async () => {
    const sql = "SELECT count(*) FROM orders WHERE status = 'delivered'";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "WHERE", "SELECT"]);
    expect(frame(r, "SELECT").total).toBe(1);
    await endsOnRealResult(sql, r);
  });

  it("says how many NULLs a summary skipped", async () => {
    const sql = "SELECT count(*), count(city), count(DISTINCT city) FROM customers";
    const r = await buildReplay(db, sql);
    expect(frame(r, "SELECT").note).toBe("SELECT summarised 20 rows into one. count(city) skipped 4 NULLs; count(DISTINCT city) skipped 4 NULLs.");
    await endsOnRealResult(sql, r);
  });

  it("labels clashing columns by table", async () => {
    const sql = "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id";
    const r = await buildReplay(db, sql);
    const from = frame(r, "FROM");
    expect(from.columns).toContain("o.id");
    expect(from.columns).toContain("c.id");
    expect(from.columns).toContain("name");
    expect(from.total).toBe(60);
    await endsOnRealResult(sql, r);
  });

  it("shows only the result for shapes it can't follow yet", async () => {
    for (const sql of [
      "WITH big AS (SELECT * FROM orders WHERE total > 5000) SELECT count(*) FROM big",
      "SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders)",
      "SELECT id, row_number() OVER (ORDER BY total) FROM orders",
      "SELECT 1 UNION SELECT 2",
      "SELECT 1 + 1",
      "UPDATE products SET stock = 0",
    ]) {
      expect((await buildReplay(db, sql)).supported, sql).toBe(false);
    }
  });
});
