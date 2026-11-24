import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { runInRollback, statementKinds } from "./run";
import { openShop } from "./seed";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

describe("statementKinds", () => {
  it("finds each statement's first keyword, ignoring strings and comments", () => {
    expect(statementKinds("select 1; -- delete\n update t set a = 'x; drop'")).toEqual(["SELECT", "UPDATE"]);
    expect(statementKinds("/* hi */ WITH x AS (SELECT 1) SELECT * FROM x;")).toEqual(["WITH"]);
    expect(statementKinds("  ")).toEqual([]);
  });
});

describe("runInRollback", () => {
  it("returns the last statement's rows with every column", async () => {
    const r = await runInRollback(db, "SELECT 1; SELECT o.id, c.id FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = 1");
    expect(r.outcome.ok).toBe(true);
    if (r.outcome.ok) {
      expect(r.outcome.result.columns).toEqual(["id", "id"]);
      expect(r.outcome.rowCount).toBe(1);
      expect(r.outcome.command).toBe("SELECT");
    }
  });
  it("reports a syntax error in plain words", async () => {
    const r = await runInRollback(db, "SELEC name FROM customers");
    expect(r.outcome.ok).toBe(false);
    if (!r.outcome.ok) {
      expect(r.outcome.message).toMatch(/^There's a typo/);
      expect(r.outcome.code).toBe("42601");
    }
  });
  it("asks for a query when the editor is empty", async () => {
    const r = await runInRollback(db, "  -- nothing\n");
    expect(r.outcome).toEqual({ ok: false, message: "Write a query first." });
  });
  it("a change never survives a run", async () => {
    const r = await runInRollback(db, "DELETE FROM order_items; DELETE FROM orders");
    expect(r.outcome.ok && r.outcome.rowCount).toBe(60);
    const after = await runInRollback(db, "SELECT count(*) FROM orders");
    expect(after.outcome.ok && after.outcome.result.rows[0]?.[0]).toBe(60);
  });
  it("refuses transaction control", async () => {
    const r = await runInRollback(db, "DELETE FROM order_items; COMMIT");
    expect(r.outcome.ok).toBe(false);
    if (!r.outcome.ok) expect(r.outcome.message).toContain("runs inside its own transaction");
  });
  it("runs a verify query after the statement, inside the same transaction", async () => {
    const r = await runInRollback(db, "UPDATE products SET stock = 0 WHERE category = 'Books'", "SELECT count(*) FROM products WHERE stock = 0");
    expect(r.outcome.ok && r.outcome.rowCount).toBe(3);
    expect(r.after?.ok && r.after.result.rows[0]?.[0]).toBe(4);
  });
  it("keeps working after an error", async () => {
    await runInRollback(db, "SELECT nope FROM customers");
    const r = await runInRollback(db, "SELECT count(*) FROM customers");
    expect(r.outcome.ok && r.outcome.result.rows[0]?.[0]).toBe(20);
  });
});
