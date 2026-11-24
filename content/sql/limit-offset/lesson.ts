import type { SqlLesson } from "@tintelix/schema";

export const limitOffset: SqlLesson = {
  id: "sql-limit-offset",
  home: "sql",
  slug: "limit-offset",
  topic: "LIMIT and OFFSET",
  title: "The top five, then the next",
  promise: "Take the top few rows of a sorted result, and page through the rest.",
  minutes: 7,
  level: 1,
  explain: [
    "**LIMIT 5** keeps the first five rows of the result. It runs last, after ORDER BY, so the sort decides which five you get.",
    "**OFFSET 5** skips five rows before LIMIT starts counting. Page 3 of a list with 10 rows a page is `LIMIT 10 OFFSET 20`.",
    "Without ORDER BY, \"the first five\" means any five. And when rows tie right at the cut, which one makes it in is Postgres's choice unless you add a tiebreaker.",
  ],
  syntax: {
    code: "SELECT name, price\nFROM products\nORDER BY price DESC, name\nLIMIT 5 OFFSET 5;",
    notes: [
      "`LIMIT n` keeps at most n rows.",
      "`OFFSET n` skips n rows first.",
      "Page p (counting from 1) of size n is `LIMIT n OFFSET (p − 1) × n`.",
    ],
  },
  mistake: "LIMIT without ORDER BY. You get some rows, not the top ones, and they can change from run to run. Deep pages have a cost too: OFFSET 100000 still reads the 100,000 rows it skips.",
  tasks: [
    {
      id: "top-three",
      prompt: "Show the **3 most expensive** products: **name** and **price**.",
      starter: "SELECT name, price\nFROM products\nORDER BY price DESC;",
      hint: "Add LIMIT 3 after the ORDER BY.",
      solution: "SELECT name, price\nFROM products\nORDER BY price DESC, name\nLIMIT 3;",
      ordered: true,
    },
    {
      id: "latest-five",
      prompt: "Show the **5 most recent** orders: **id**, **ordered_at** and **total**. For two on the same day, the higher id first. The starter gets the five oldest.",
      starter: "SELECT id, ordered_at, total\nFROM orders\nLIMIT 5;",
      hint: "LIMIT keeps the first rows, so sort newest first before it: ORDER BY ordered_at DESC, id DESC.",
      solution: "SELECT id, ordered_at, total\nFROM orders\nORDER BY ordered_at DESC, id DESC\nLIMIT 5;",
      ordered: true,
    },
    {
      id: "page-two",
      prompt: "The shop lists products 4 to a page, cheapest first (ties A to Z). Show **page 2**: **name** and **price**.",
      starter: "SELECT name, price\nFROM products\nORDER BY price, name\nLIMIT 4;",
      hint: "Page 2 skips the 4 rows of page 1: OFFSET 4.",
      solution: "SELECT name, price\nFROM products\nORDER BY price, name\nLIMIT 4 OFFSET 4;",
      ordered: true,
    },
    {
      id: "fourth-to-sixth",
      prompt: "Show the **4th, 5th and 6th** biggest orders by total: **id** and **total**, lower id first on a tie.",
      starter: "SELECT id, total\nFROM orders\nORDER BY total DESC, id\nLIMIT 6;",
      hint: "Skip the top 3 with OFFSET 3, then keep 3 with LIMIT 3.",
      solution: "SELECT id, total\nFROM orders\nORDER BY total DESC, id\nLIMIT 3 OFFSET 3;",
      ordered: true,
    },
  ],
  buildsOn: ["sql-order-by"],
  cheatsheet: [
    { heading: "Top rows", text: ["`ORDER BY price DESC LIMIT 3` gives the three most expensive.", "LIMIT runs last, after ORDER BY."] },
    { heading: "Pages", text: ["`LIMIT 10 OFFSET 20` is page 3 at 10 a page.", "Page p of size n: `LIMIT n OFFSET (p − 1) × n`."] },
    { heading: "Keep it stable", text: ["Always sort before LIMIT, and add a tiebreaker so the cut lands in the same place every time."] },
  ],
};
