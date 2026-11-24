import type { SqlTask } from "@tintelix/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkSqlTask } from "./check";
import type { Db } from "./db";
import { openShop } from "./seed";

let db: Db;
beforeAll(async () => { db = await openShop(); }, 30000);
afterAll(async () => { await db.close?.(); });

const names: SqlTask = { id: "names", prompt: "List every customer's name.", starter: "SELECT * FROM customers", hint: "h", solution: "SELECT name FROM customers", ordered: false };
const restock: SqlTask = {
  id: "restock", kind: "change", prompt: "Set the Spice Box's stock to 50.", starter: "UPDATE products SET stock = 50", hint: "h",
  solution: "UPDATE products SET stock = 50 WHERE name = 'Spice Box'", ordered: true, verify: "SELECT id, stock FROM products ORDER BY id",
};

describe("checkSqlTask", () => {
  it("passes the solution", async () => {
    expect((await checkSqlTask(db, names, names.solution)).feedback).toEqual({ ok: true });
  });
  it("checks the last statement", async () => {
    expect((await checkSqlTask(db, names, "SELECT 1; SELECT name FROM customers")).feedback).toEqual({ ok: true });
  });
  it("explains what's wrong with the result", async () => {
    const { feedback } = await checkSqlTask(db, names, "SELECT name, city FROM customers");
    expect(feedback).toMatchObject({ ok: false, kind: "columns" });
  });
  it("turns a Postgres error into feedback", async () => {
    const { run, feedback } = await checkSqlTask(db, names, "SELECT nme FROM customers");
    expect(run.ok).toBe(false);
    expect(feedback).toMatchObject({ ok: false, kind: "error", message: "There's no column called nme. Check the spelling against the dataset card." });
  });
  it("lets Postgres point out a typo in a reading task", async () => {
    const { feedback } = await checkSqlTask(db, names, "SELEC name FROM customers");
    expect(feedback).toMatchObject({ ok: false, kind: "error" });
    if (!feedback.ok) expect(feedback.message).toMatch(/^There's a typo near SELEC/);
  });

  it("refuses a change in a reading task without running it", async () => {
    const { feedback } = await checkSqlTask(db, names, "DELETE FROM orders");
    expect(feedback).toMatchObject({ ok: false, kind: "kind" });
    if (!feedback.ok) expect(feedback.message).toContain("SELECT");
  });
  it("compares the verify query for a change task", async () => {
    expect((await checkSqlTask(db, restock, restock.solution)).feedback).toEqual({ ok: true });
    const wrong = await checkSqlTask(db, restock, restock.starter);
    expect(wrong.run.ok && wrong.run.rowCount).toBe(15);
    expect(wrong.feedback).toMatchObject({ ok: false, kind: "rows" });
  });
});
