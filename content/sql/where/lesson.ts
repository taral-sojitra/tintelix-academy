import type { SqlLesson } from "@tintelix/schema";

export const where: SqlLesson = {
  id: "sql-where",
  home: "sql",
  slug: "where",
  topic: "WHERE",
  title: "Only the rows that match",
  promise: "Keep only the rows you want, combine tests with AND and OR, and find missing values the right way.",
  minutes: 9,
  level: 1,
  explain: [
    "**WHERE** tests every row and keeps only the rows where the test is true. It runs after FROM and before SELECT, so it can test any column of the table, even one you don't pick.",
    "Compare with `=`, `<>`, `<`, `>=` and friends. `IN ('a', 'b')` checks a list, and `BETWEEN 500 AND 1000` checks a range with both ends included. Join tests with **AND** (both true) or **OR** (either true).",
    "A missing value is **NULL**, and NULL isn't equal to anything, not even another NULL. So `city = NULL` is never true. Ask with `IS NULL` or `IS NOT NULL` instead.",
  ],
  syntax: {
    code: "SELECT name, price\nFROM products\nWHERE category = 'Books' AND price < 700;",
    notes: [
      "Text goes in single quotes: 'Books'. Double quotes are for column names.",
      "AND is worked out before OR, like × before +. Add brackets when you mix them.",
      "`IS NULL` finds missing values; `= NULL` never does.",
    ],
  },
  mistake: "Writing `WHERE city = NULL`. It runs without an error and returns nothing, because a comparison with NULL is unknown, never true. Write `WHERE city IS NULL`.",
  tasks: [
    {
      id: "fitness",
      prompt: "List the **name** and **price** of every product in the **Fitness** category.",
      starter: "SELECT name, price\nFROM products;",
      hint: "Add a WHERE line after FROM that compares category with the text 'Fitness'.",
      solution: "SELECT name, price\nFROM products\nWHERE category = 'Fitness';",
      ordered: false,
    },
    {
      id: "big-orders",
      prompt: "Find the **id** and **total** of every order over ₹10,000.",
      starter: "SELECT id, total\nFROM orders;",
      hint: "Numbers don't need quotes: WHERE total > 10000.",
      solution: "SELECT id, total\nFROM orders\nWHERE total > 10000;",
      ordered: false,
    },
    {
      id: "no-city",
      prompt: "Show the **name** of every customer who hasn't told us their city. The starter looks right but finds nobody. Why?",
      starter: "SELECT name\nFROM customers\nWHERE city = NULL;",
      hint: "Nothing equals NULL. There's a special test for a missing value.",
      solution: "SELECT name\nFROM customers\nWHERE city IS NULL;",
      ordered: false,
    },
    {
      id: "open-and-big",
      prompt: "List the **id**, **status** and **total** of orders that are **shipped** or **placed** and cost at least ₹5,000. The starter returns too many rows.",
      starter: "SELECT id, status, total\nFROM orders\nWHERE status = 'shipped' OR status = 'placed' AND total >= 5000;",
      hint: "AND is worked out first, so the ₹5,000 test only applies to placed orders. Use brackets, or status IN ('shipped', 'placed').",
      solution: "SELECT id, status, total\nFROM orders\nWHERE status IN ('shipped', 'placed') AND total >= 5000;",
      ordered: false,
    },
  ],
  buildsOn: ["sql-select"],
  cheatsheet: [
    { heading: "Keep matching rows", text: ["`WHERE category = 'Books'` keeps rows whose category is Books.", "`WHERE total BETWEEN 500 AND 1000` includes 500 and 1000.", "`WHERE status IN ('shipped', 'placed')` checks a list."] },
    { heading: "Combine tests", text: ["`AND` needs both tests true; `OR` needs either.", "AND is worked out before OR: `a OR b AND c` means `a OR (b AND c)`. Use brackets."] },
    { heading: "Missing values", text: ["`city IS NULL` finds rows with no city; `city IS NOT NULL` finds the rest.", "`city = NULL` and `city <> NULL` are never true."] },
  ],
};
