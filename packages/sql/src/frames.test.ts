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

  it("says which rows a join left out", async () => {
    const r = await buildReplay(db, "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id");
    expect(frame(r, "FROM").note).toBe("FROM joined orders and customers into 60 rows. 5 rows of customers had no match, so they're left out.");
  });

  it("says which rows a LEFT JOIN kept with NULLs, and marks them", async () => {
    const sql = "SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id";
    const r = await buildReplay(db, sql);
    const from = frame(r, "FROM");
    expect(from.note).toBe("FROM joined customers and orders into 65 rows. 5 had no match in orders, so LEFT JOIN kept them with NULLs.");
    expect(from.marks?.filter((m) => m === "filled")).toHaveLength(5);
    await endsOnRealResult(sql, r);
  });

  it("shows each WITH step, then the main query reading from it", async () => {
    const sql = "WITH spend AS (SELECT customer_id, sum(total) AS spent FROM orders GROUP BY customer_id) SELECT customer_id, spent FROM spend WHERE spent > 20000 ORDER BY spent DESC";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["WITH", "FROM", "WHERE", "SELECT", "ORDER BY"]);
    const step = frame(r, "WITH");
    expect(step).toMatchObject({ label: "WITH spend", columns: ["customer_id", "spent"], total: 15 });
    expect(step.note).toBe("WITH made a step called spend: 15 rows. The main query reads it like a table.");
    expect(frame(r, "FROM").note).toBe("FROM starts with every row of spend: 15 rows.");
    await endsOnRealResult(sql, r);
  });

  it("shows several WITH steps in order", async () => {
    const sql = "WITH books AS (SELECT id, name FROM products WHERE category = 'Books'), sold AS (SELECT i.product_id, sum(i.quantity) AS units FROM order_items i JOIN books b ON b.id = i.product_id GROUP BY i.product_id) SELECT b.name, s.units FROM books b JOIN sold s ON s.product_id = b.id";
    const r = await buildReplay(db, sql);
    if (!r.supported) throw new Error(r.reason);
    expect(r.frames.filter((f) => f.clause === "WITH").map((f) => f.label)).toEqual(["WITH books", "WITH sold"]);
    await endsOnRealResult(sql, r);
  });

  it("splits, sorts and numbers rows for a window function", async () => {
    const sql = "SELECT customer_id, id, ordered_at, row_number() OVER (PARTITION BY customer_id ORDER BY ordered_at DESC, id DESC) AS rn FROM orders";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "OVER", "SELECT"]);
    const over = frame(r, "OVER");
    expect(new Set(over.groups).size).toBe(15);
    expect(over.columns).toEqual(["customer_id", "id", "ordered_at", "rn"]);
    // Each group starts at 1 and counts up.
    over.rows.forEach((row, i) => {
      const start = i === 0 || over.groups![i - 1] !== over.groups![i];
      expect(Number(row[3])).toBe(start ? 1 : Number(over.rows[i - 1]![3]) + 1);
    });
    expect(over.note).toBe("OVER split the 60 rows into 15 groups by customer_id, sorted each by ordered_at DESC, id DESC, and numbered the rows from 1 in each group.");
    await endsOnRealResult(sql, r);
  });

  it("follows a window over the whole result", async () => {
    const sql = "SELECT name, price, rank() OVER (ORDER BY price DESC) AS r FROM products ORDER BY r, name";
    const r = await buildReplay(db, sql);
    expect(clauses(r)).toEqual(["FROM", "OVER", "SELECT", "ORDER BY"]);
    expect(frame(r, "OVER").groups).toBeUndefined();
    expect(frame(r, "OVER").note).toBe("OVER sorted the 15 rows by price DESC and ranked them; ties share a rank.");
    await endsOnRealResult(sql, r);
  });

  it("follows a window over everything at once", async () => {
    const sql = "SELECT id, sum(total) OVER () AS everything FROM orders";
    const r = await buildReplay(db, sql);
    expect(frame(r, "OVER").note).toBe("OVER looked at all 60 rows at once and put the sum of all of them on every row.");
    await endsOnRealResult(sql, r);
  });

  it("shows only the result for shapes it can't follow yet", async () => {
    for (const sql of [
      "WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 3) SELECT i FROM n",
      "SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders)",
      "SELECT id FROM orders ORDER BY row_number() OVER (ORDER BY total)",
      "SELECT 1 UNION SELECT 2",
      "SELECT 1 + 1",
      "UPDATE products SET stock = 0",
    ]) {
      expect((await buildReplay(db, sql)).supported, sql).toBe(false);
    }
  });
});
