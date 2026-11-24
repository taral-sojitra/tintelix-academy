import type { SqlLesson } from "@tintelix/schema";

const coupons = "CREATE TABLE coupons (id serial PRIMARY KEY, code text);\nINSERT INTO coupons (code) VALUES ('A'), ('B');";

export const truncate: SqlLesson = {
  id: "sql-truncate",
  home: "sql",
  slug: "truncate",
  topic: "TRUNCATE",
  title: "Empty it in one go",
  promise: "Empty a whole table at once and keep the table, and know when DELETE is the right tool instead.",
  minutes: 7,
  level: 2,
  explain: [
    "**TRUNCATE** empties a table in one go: every row is gone, but the table, its columns and its rules stay. On big tables it's far faster than DELETE, because it doesn't visit row by row.",
    "It has no WHERE: it's all or nothing. If other tables point at this one, list them in the same TRUNCATE, or add CASCADE to empty them too. `RESTART IDENTITY` also sets the id counter back to 1.",
    "In Postgres a TRUNCATE inside a transaction can be rolled back, like every run here. Outside one, it's as final for the data as DROP.",
  ],
  syntax: {
    code: "TRUNCATE order_items;\nTRUNCATE orders, order_items;\nTRUNCATE coupons RESTART IDENTITY;",
    notes: [
      "No WHERE: every row goes.",
      "Tables that point at it: list them too, or add CASCADE.",
      "RESTART IDENTITY numbers new rows from 1 again.",
    ],
  },
  mistake: "Using TRUNCATE when you meant `DELETE … WHERE`. TRUNCATE has no WHERE and empties the whole table. If any rows should stay, it's DELETE.",
  tasks: [
    {
      id: "empty-lines",
      kind: "define",
      prompt: "Empty **order_items** in one go. The starter only counts its rows.",
      starter: "SELECT count(*)\nFROM order_items;",
      hint: "TRUNCATE order_items;",
      solution: "TRUNCATE order_items;",
      ordered: false,
      verify: "SELECT count(*) FROM order_items",
    },
    {
      id: "empty-orders",
      kind: "define",
      prompt: "Empty **orders**. order_items points at it, so TRUNCATE orders on its own is refused (try it). The starter empties only the lines; empty both in one statement.",
      starter: "TRUNCATE order_items;",
      hint: "List both tables: TRUNCATE orders, order_items; (or TRUNCATE orders CASCADE;)",
      solution: "TRUNCATE orders, order_items;",
      ordered: false,
      verify: "SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM order_items) AS lines",
    },
    {
      id: "restart",
      kind: "define",
      prompt: "The first lines make coupons with two rows. Empty it so the next coupon, **C**, gets id **1** again. The starter's TRUNCATE keeps counting, so C gets id 3.",
      starter: `${coupons}\n\nTRUNCATE coupons;\nINSERT INTO coupons (code) VALUES ('C');`,
      hint: "TRUNCATE coupons RESTART IDENTITY;",
      solution: `${coupons}\n\nTRUNCATE coupons RESTART IDENTITY;\nINSERT INTO coupons (code) VALUES ('C');`,
      ordered: false,
      verify: "SELECT id, code FROM coupons",
    },
    {
      id: "keep-some",
      kind: "change",
      prompt: "Remove only the lines of **cancelled** orders and keep the rest. TRUNCATE can't pick rows, so the starter empties everything.",
      starter: "TRUNCATE order_items;",
      hint: "That's a DELETE with a WHERE: order_id IN (SELECT id FROM orders WHERE status = 'cancelled').",
      solution: "DELETE FROM order_items\nWHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');",
      ordered: false,
      verify: "SELECT order_id, product_id FROM order_items",
    },
  ],
  buildsOn: ["sql-delete"],
  cheatsheet: [
    { heading: "Empty a table", text: ["`TRUNCATE order_items;` removes every row; the table stays.", "Faster than DELETE on big tables."] },
    { heading: "Linked tables", text: ["`TRUNCATE orders, order_items;` or `TRUNCATE orders CASCADE;`", "`RESTART IDENTITY` numbers new rows from 1 again."] },
    { heading: "Not for some rows", text: ["TRUNCATE has no WHERE. To keep some rows, use DELETE … WHERE."] },
  ],
};
