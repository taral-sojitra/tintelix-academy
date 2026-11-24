import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { openShop } from "./seed";
import { sortTies } from "./ties";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

describe("sortTies", () => {
  it("counts rows that tie on every sort key", async () => {
    // 1299 (twice), 899 (twice) and 499 (twice) tie on price alone.
    expect(await sortTies(db, "SELECT name, price FROM products ORDER BY price DESC")).toBe(3);
    expect(await sortTies(db, "SELECT name, price FROM products ORDER BY price DESC, name")).toBe(0);
  });
  it("follows a sort by an output name, and ignores LIMIT", async () => {
    expect(await sortTies(db, "SELECT id, ROUND(total * 1.18, 2) AS with_tax FROM orders ORDER BY with_tax DESC LIMIT 3")).toBeGreaterThan(0);
    expect(await sortTies(db, "SELECT id, ROUND(total * 1.18, 2) AS with_tax FROM orders ORDER BY with_tax DESC, id LIMIT 3")).toBe(0);
  });
  it("works for grouped queries and WITH", async () => {
    expect(await sortTies(db, "SELECT status, count(*) AS n FROM orders GROUP BY status ORDER BY n DESC")).toBe(0);
    expect(await sortTies(db, "WITH b AS (SELECT * FROM products WHERE category = 'Books') SELECT name FROM b ORDER BY price")).toBe(0);
  });
  it("says it can't tell for a query without ORDER BY", async () => {
    await expect(sortTies(db, "SELECT name FROM products")).rejects.toThrow("no ORDER BY");
  });
});
