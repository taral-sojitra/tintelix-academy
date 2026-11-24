import type { SqlLesson } from "@tintelix/schema";
import { describeTable } from "@tintelix/sql/tables";

const coupons = describeTable("coupons");

export const createTable: SqlLesson = {
  id: "sql-create-table",
  home: "sql",
  slug: "create-table",
  topic: "CREATE TABLE",
  title: "Make a new table",
  promise: "Make a table with the right columns and the rules that keep bad rows out from day one.",
  minutes: 10,
  level: 2,
  explain: [
    "**CREATE TABLE** makes a new, empty table: its name, then each column with its type. Common types are `integer`, `numeric(10,2)` for money, `text`, `date` and `boolean`.",
    "Rules sit next to a column: **PRIMARY KEY** (one row per value, never empty), **NOT NULL** (a value is required), **UNIQUE**, **DEFAULT** (the value when none is given) and **CHECK (…)** (a test every row must pass).",
    "**REFERENCES products(id)** ties a column to another table's key, so Postgres refuses a product_id that doesn't exist. `serial` makes an integer that counts up by itself, the way id works in the shop.",
  ],
  syntax: {
    code: "CREATE TABLE reviews (\n  id serial PRIMARY KEY,\n  product_id integer NOT NULL REFERENCES products(id),\n  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),\n  body text\n);",
    notes: [
      "One line per column: name, type, then its rules.",
      "Commas between columns, none after the last.",
      "The table starts empty; INSERT adds rows.",
    ],
  },
  mistake: "Leaving the rules for later. A table with no primary key or NOT NULL happily takes duplicates and gaps, and cleaning those up afterwards is far harder than refusing them on the way in.",
  tasks: [
    {
      id: "columns",
      kind: "define",
      prompt: "Make a table **coupons** with a **code** column (text) and a **percent_off** column (integer).",
      starter: "CREATE TABLE coupons (\n  code text\n);",
      hint: "Add a comma after code text, then percent_off integer.",
      solution: "CREATE TABLE coupons (\n  code text,\n  percent_off integer\n);",
      ordered: false,
      verify: coupons,
    },
    {
      id: "rules",
      kind: "define",
      prompt: "Make coupons with rules: **code** is the PRIMARY KEY and **percent_off** is NOT NULL.",
      starter: "CREATE TABLE coupons (\n  code text,\n  percent_off integer\n);",
      hint: "Rules go after the type: code text PRIMARY KEY, percent_off integer NOT NULL.",
      solution: "CREATE TABLE coupons (\n  code text PRIMARY KEY,\n  percent_off integer NOT NULL\n);",
      ordered: false,
      verify: coupons,
    },
    {
      id: "check",
      kind: "define",
      prompt: "Add a CHECK that **percent_off** is between 1 and 90, and a **valid_until** column of type date.",
      starter: "CREATE TABLE coupons (\n  code text PRIMARY KEY,\n  percent_off integer NOT NULL\n);",
      hint: "percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 90), then valid_until date.",
      solution: "CREATE TABLE coupons (\n  code text PRIMARY KEY,\n  percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 90),\n  valid_until date\n);",
      ordered: false,
      verify: coupons,
    },
    {
      id: "reviews",
      kind: "define",
      prompt: "Make **reviews**: **id** counts up and is the PRIMARY KEY; **product_id** (integer, required) must point at a product; **stars** (integer, required) must be 1 to 5; **body** is text. The starter has no link and no check.",
      starter: "CREATE TABLE reviews (\n  id serial PRIMARY KEY,\n  product_id integer NOT NULL,\n  stars integer NOT NULL,\n  body text\n);",
      hint: "product_id integer NOT NULL REFERENCES products(id), and stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5).",
      solution: "CREATE TABLE reviews (\n  id serial PRIMARY KEY,\n  product_id integer NOT NULL REFERENCES products(id),\n  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),\n  body text\n);",
      ordered: false,
      verify: describeTable("reviews"),
    },
    {
      id: "fill-it",
      kind: "define",
      prompt: "Make coupons (code text PRIMARY KEY, percent_off integer NOT NULL) and, in the same run, add **WELCOME10** at 10% off and **DIWALI15** at 15%.",
      starter: "CREATE TABLE coupons (\n  code text PRIMARY KEY,\n  percent_off integer NOT NULL\n);",
      hint: "After the CREATE TABLE's semicolon: INSERT INTO coupons (code, percent_off) VALUES ('WELCOME10', 10), ('DIWALI15', 15);",
      solution: "CREATE TABLE coupons (\n  code text PRIMARY KEY,\n  percent_off integer NOT NULL\n);\n\nINSERT INTO coupons (code, percent_off)\nVALUES ('WELCOME10', 10), ('DIWALI15', 15);",
      ordered: false,
      verify: "SELECT code, percent_off FROM coupons",
    },
  ],
  buildsOn: [],
  cheatsheet: [
    { heading: "Make a table", text: ["`CREATE TABLE coupons (code text PRIMARY KEY, percent_off integer NOT NULL);`", "Types: integer, numeric(10,2), text, date, boolean."] },
    { heading: "Rules", text: ["PRIMARY KEY · NOT NULL · UNIQUE · DEFAULT 0 · CHECK (stars BETWEEN 1 AND 5)", "`REFERENCES products(id)` refuses links to rows that don't exist."] },
    { heading: "Counting ids", text: ["`id serial PRIMARY KEY` numbers rows by itself."] },
  ],
};
