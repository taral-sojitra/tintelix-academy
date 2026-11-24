import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { openShop, SHOP_TABLES } from "./seed";

let db: Db;
const one = async (sql: string) => Number((await db.query(sql)).rows[0]?.[0]);

beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

describe("the Tintelix Shop seed", () => {
  it("has the planned number of rows", async () => {
    expect(await one("SELECT count(*) FROM customers")).toBe(20);
    expect(await one("SELECT count(*) FROM products")).toBe(15);
    expect(await one("SELECT count(*) FROM orders")).toBe(60);
    const lines = await one("SELECT count(*) FROM order_items");
    expect(lines).toBeGreaterThanOrEqual(140);
    expect(lines).toBeLessThanOrEqual(160);
  });

  it("keeps every order total equal to its lines", async () => {
    expect(await one(`SELECT count(*) FROM orders o WHERE o.total <>
      (SELECT sum(quantity * unit_price) FROM order_items i WHERE i.order_id = o.id)`)).toBe(0);
  });

  it("has the gaps lessons need: customers with no orders, NULL cities, few coupons", async () => {
    expect(await one("SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)")).toBeGreaterThanOrEqual(3);
    expect(await one("SELECT count(*) FROM customers WHERE city IS NULL")).toBeGreaterThanOrEqual(3);
    const coupons = await one("SELECT count(*) FROM orders WHERE coupon IS NOT NULL");
    expect(coupons).toBeGreaterThanOrEqual(2);
    expect(coupons).toBeLessThan(30);
    expect(await one("SELECT count(DISTINCT category) FROM products")).toBe(4);
  });

  it("is the same every time", async () => {
    const again = await openShop();
    const a = await db.query("SELECT * FROM orders ORDER BY id");
    const b = await again.query("SELECT * FROM orders ORDER BY id");
    expect(b.rows).toEqual(a.rows);
    await again.close?.();
  }, 30000);

  it("describes the same columns the database has", async () => {
    const { rows } = await db.query(`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
    const actual = rows.map((r) => `${r[0]}.${r[1]}`);
    const described = [...SHOP_TABLES].sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((t) => t.columns.map((c) => `${t.name}.${c.name}`));
    expect(described).toEqual(actual);
  });
});
