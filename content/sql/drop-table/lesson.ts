import type { SqlLesson } from "@tintelix/schema";
import { describeRelations } from "@tintelix/sql/tables";

const coupons = "CREATE TABLE coupons (code text PRIMARY KEY, percent_off integer);";
const withView = `${coupons}\nCREATE VIEW big_coupons AS\n  SELECT code FROM coupons WHERE percent_off >= 15;`;
const relations = describeRelations();

export const dropTable: SqlLesson = {
  id: "sql-drop-table",
  home: "sql",
  slug: "drop-table",
  topic: "DROP TABLE",
  title: "Gone, and what goes with it",
  promise: "Remove a table for good, and know exactly what CASCADE takes with it.",
  minutes: 8,
  level: 2,
  explain: [
    "**DROP TABLE** removes a table: its rows, columns and indexes, all of it. Outside a transaction there's no undo.",
    "If something depends on the table, like a view built on it or another table's REFERENCES pointing at it, Postgres refuses and names what's in the way. **CASCADE** drops those too: views built on it go, and links from other tables go, though those tables stay.",
    "`DROP TABLE IF EXISTS promotions` doesn't fail when there's nothing to drop, which helps in setup scripts. To empty a table but keep it, use TRUNCATE, the next lesson. These tasks make their own tables first, since every run starts from a fresh shop.",
  ],
  syntax: {
    code: "DROP TABLE coupons;\nDROP TABLE IF EXISTS promotions;\nDROP TABLE products CASCADE;\nDROP VIEW big_coupons;",
    notes: [
      "Plain DROP TABLE refuses if anything depends on the table.",
      "CASCADE removes the views on it and the links to it.",
      "DROP VIEW removes a view and leaves its table.",
    ],
  },
  mistake: "Reaching for CASCADE without reading what it will take. Postgres's refusal lists the dependents for a reason: CASCADE removes views and links you may still need. Drop the ones you mean to, on purpose.",
  tasks: [
    {
      id: "drop-coupons",
      kind: "define",
      prompt: "The first line makes a coupons table. Drop it again in the same run. The starter only looks at it.",
      starter: `${coupons}\n\nSELECT * FROM coupons;`,
      hint: "Replace the SELECT with DROP TABLE coupons;",
      solution: `${coupons}\n\nDROP TABLE coupons;`,
      ordered: false,
      verify: relations,
    },
    {
      id: "cascade-view",
      kind: "define",
      prompt: "This time a view, big_coupons, is built on coupons. Drop coupons **and** the view. (Try plain DROP TABLE coupons first and read the refusal.)",
      starter: `${withView}\n\nSELECT * FROM big_coupons;`,
      hint: "DROP TABLE coupons CASCADE; takes the view with it.",
      solution: `${withView}\n\nDROP TABLE coupons CASCADE;`,
      ordered: false,
      verify: relations,
    },
    {
      id: "view-only",
      kind: "define",
      prompt: "Drop only the view big_coupons and keep the coupons table. The starter drops both.",
      starter: `${withView}\n\nDROP TABLE coupons CASCADE;`,
      hint: "DROP VIEW big_coupons; removes the view and leaves the table.",
      solution: `${withView}\n\nDROP VIEW big_coupons;`,
      ordered: false,
      verify: relations,
    },
    {
      id: "products",
      kind: "define",
      prompt: "Drop the shop's **products** table, and the link order_items has to it. The starter drops a table that doesn't exist, harmlessly, thanks to IF EXISTS. (Try DROP TABLE products without CASCADE to see what points at it.)",
      starter: "DROP TABLE IF EXISTS promotions;",
      hint: "DROP TABLE products CASCADE; order_items stays, its link to products goes.",
      solution: "DROP TABLE products CASCADE;",
      ordered: false,
      verify: relations,
    },
  ],
  buildsOn: ["sql-create-table"],
  cheatsheet: [
    { heading: "Drop", text: ["`DROP TABLE coupons;` removes the table, its rows and indexes.", "`DROP TABLE IF EXISTS promotions;` doesn't fail when it's missing."] },
    { heading: "Dependents", text: ["Plain DROP refuses and names what depends on the table.", "`CASCADE` drops views built on it and links pointing at it; the other tables stay."] },
    { heading: "Views", text: ["`DROP VIEW big_coupons;` removes only the view."] },
  ],
};
