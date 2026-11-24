import type { SqlLesson } from "@tintelix/schema";

export const leftJoin: SqlLesson = {
  id: "sql-left-join",
  home: "sql",
  slug: "left-join",
  topic: "LEFT JOIN",
  title: "Who never ordered?",
  promise: "Keep every row of one table even when it has no match, and find the rows that don't.",
  minutes: 10,
  level: 2,
  explain: [
    "**LEFT JOIN** keeps every row of the table on the left, matched or not. Where there's no match, the right table's columns come back as NULL.",
    "That makes \"who never…?\" questions easy: LEFT JOIN, then `WHERE o.id IS NULL` keeps only the rows that found no match.",
    "Two traps. A WHERE test on the right table, like `WHERE o.status = 'delivered'`, throws the NULL rows away and turns it back into an inner join; put that test in ON instead. And `count(*)` counts a NULL-filled row as 1; count a right-table column, `count(o.id)`, to get 0.",
  ],
  syntax: {
    code: "SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;",
    notes: [
      "Every row of the left table (customers) stays.",
      "No match: the right table's columns are NULL.",
      "Tests on the right table go in ON, not WHERE, unless you mean to drop the unmatched rows.",
    ],
  },
  mistake: "Filtering the right table in WHERE after a LEFT JOIN. `WHERE o.status = 'delivered'` drops every customer without a delivered order, because their o.status is NULL. Move the test into ON: `… ON o.customer_id = c.id AND o.status = 'delivered'`.",
  tasks: [
    {
      id: "everyone",
      prompt: "List every customer's **name** with the **id** of each order they placed. Customers with no orders must still appear. The starter loses five of them.",
      starter: "SELECT c.name, o.id\nFROM customers c\nJOIN orders o ON o.customer_id = c.id;",
      hint: "Change JOIN to LEFT JOIN, so every customer stays.",
      solution: "SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;",
      ordered: false,
    },
    {
      id: "never-ordered",
      prompt: "Who never ordered? List the **name** of every customer with no orders.",
      starter: "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id;",
      hint: "Rows with no match have NULL in every orders column: WHERE o.id IS NULL.",
      solution: "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;",
      ordered: false,
    },
    {
      id: "zero-orders",
      prompt: "Show each customer's **name** and their number of orders as `orders`, with **0** for those who have none.",
      starter: "SELECT c.name, count(*) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;",
      hint: "count(*) counts the NULL-filled row too. count(o.id) skips NULLs.",
      solution: "SELECT c.name, count(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.name;",
      ordered: false,
      namedColumns: ["name", "orders"],
    },
    {
      id: "on-not-where",
      prompt: "List every customer's **name** with the **id** of their **delivered** orders. Customers with none should still appear, with an empty id. The starter loses them.",
      starter: "SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'delivered';",
      hint: "Move the status test from WHERE into ON: ON o.customer_id = c.id AND o.status = 'delivered'.",
      solution: "SELECT c.name, o.id\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'delivered';",
      ordered: false,
    },
  ],
  buildsOn: ["sql-inner-join"],
  cheatsheet: [
    { heading: "Keep the left side", text: ["`FROM customers c LEFT JOIN orders o ON o.customer_id = c.id`", "Customers without orders stay, with NULL order columns."] },
    { heading: "Find what's missing", text: ["Add `WHERE o.id IS NULL` to keep only rows with no match."] },
    { heading: "Traps", text: ["A WHERE test on the right table undoes the LEFT JOIN; put it in ON.", "`count(o.id)` gives 0 for no match; `count(*)` gives 1."] },
  ],
};
