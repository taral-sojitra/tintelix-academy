import type { SqlLesson } from "@tintelix/schema";

export const distinct: SqlLesson = {
  id: "sql-distinct",
  home: "sql",
  slug: "distinct",
  topic: "DISTINCT",
  title: "Every city, once",
  promise: "Fold repeated rows into one, and know exactly what counts as a repeat.",
  minutes: 7,
  level: 1,
  explain: [
    "**DISTINCT** removes repeated rows from the result. It works on the whole row: `SELECT DISTINCT country, city` keeps each pair once, not each country once.",
    "It runs after SELECT and before ORDER BY, so it only sees the columns you picked. Two rows are repeats when every picked column matches.",
    "Here two NULLs count as the same, so you get a single NULL row. That's unlike `=`, where NULL never matches anything.",
  ],
  syntax: {
    code: "SELECT DISTINCT category\nFROM products\nORDER BY category;",
    notes: [
      "DISTINCT goes straight after SELECT and covers every column listed.",
      "With DISTINCT, ORDER BY can only use columns you selected.",
      "Repeats are judged on the picked columns only.",
    ],
  },
  mistake: "Adding DISTINCT to hide repeats you can't explain. Unexpected repeats usually mean a join matched more rows than you thought; DISTINCT hides the symptom and keeps the bug. Find out why the rows repeat first.",
  tasks: [
    {
      id: "categories",
      prompt: "List every **category** the shop sells, once each.",
      starter: "SELECT category\nFROM products;",
      hint: "Put DISTINCT straight after SELECT.",
      solution: "SELECT DISTINCT category\nFROM products;",
      ordered: false,
    },
    {
      id: "cities",
      prompt: "Which **cities** do our customers live in? One row per city, and leave out the missing ones. The starter has one row too many.",
      starter: "SELECT DISTINCT city\nFROM customers;",
      hint: "DISTINCT keeps one NULL. Filter it out with WHERE … IS NOT NULL.",
      solution: "SELECT DISTINCT city\nFROM customers\nWHERE city IS NOT NULL;",
      ordered: false,
    },
    {
      id: "pairs",
      prompt: "List each different pair of **country** and **city** among our customers, NULL cities included.",
      starter: "SELECT DISTINCT country\nFROM customers;",
      hint: "DISTINCT covers every column you list: add city after country.",
      solution: "SELECT DISTINCT country, city\nFROM customers;",
      ordered: false,
    },
    {
      id: "buyers",
      prompt: "Which **customer_id**s have placed an order? Each once, smallest first.",
      starter: "SELECT customer_id\nFROM orders\nORDER BY customer_id;",
      hint: "Keep the ORDER BY and add DISTINCT after SELECT.",
      solution: "SELECT DISTINCT customer_id\nFROM orders\nORDER BY customer_id;",
      ordered: true,
    },
  ],
  buildsOn: ["sql-select"],
  cheatsheet: [
    { heading: "Fold repeats", text: ["`SELECT DISTINCT category FROM products;` lists each category once.", "`SELECT DISTINCT country, city` keeps each pair once."] },
    { heading: "What counts as a repeat", text: ["Rows repeat when every picked column matches.", "Two NULLs count as the same here, so one NULL row stays."] },
    { heading: "With ORDER BY", text: ["DISTINCT runs before ORDER BY, and ORDER BY may only use selected columns."] },
  ],
};
