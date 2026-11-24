import type { SqlLesson } from "@tintelix/schema";

export const select: SqlLesson = {
  id: "sql-select",
  home: "sql",
  slug: "select",
  topic: "SELECT",
  title: "Pick the columns you need",
  promise: "Ask a table for exactly the columns you want, rename them, and work out new ones.",
  minutes: 8,
  level: 1,
  explain: [
    "A table is rows and columns. **SELECT** says which columns you want back, and **FROM** says which table to read them from.",
    "Postgres reads the table first, then keeps only the columns you named, in the order you named them. `SELECT *` keeps them all.",
    "**AS** renames a column in the result. A column doesn't have to exist in the table, either: `price * 2` works out a value for every row.",
  ],
  syntax: {
    code: "SELECT column, other_column AS new_name, price * 2 AS doubled\nFROM table_name;",
    notes: [
      "Columns come back in the order you list them.",
      "AS renames a column in the result only; the table doesn't change.",
      "The semicolon ends a statement. You need it between statements; at the very end it's optional.",
    ],
  },
  mistake: "Using `SELECT *` in real code. It's fine for a quick look, but it pulls every column, changes shape when someone adds one, and hides what the code needs. Name your columns.",
  tasks: [
    {
      id: "names-prices",
      prompt: "List every product's **name** and **price**.",
      starter: "SELECT *\nFROM products;",
      hint: "Replace * with the two column names, separated by a comma.",
      solution: "SELECT name, price\nFROM products;",
      ordered: false,
    },
    {
      id: "name-city",
      prompt: "Show each customer's **name** and **city**, with the name first.",
      starter: "SELECT city, name\nFROM customers;",
      hint: "Columns come back in the order you list them.",
      solution: "SELECT name, city\nFROM customers;",
      ordered: false,
    },
    {
      id: "rename",
      prompt: "Show every order's **id** and **total**, but call the total column `amount`.",
      starter: "SELECT id, total\nFROM orders;",
      hint: "Write AS and the new name straight after the column: total AS amount.",
      solution: "SELECT id, total AS amount\nFROM orders;",
      ordered: false,
      namedColumns: ["id", "amount"],
    },
    {
      id: "with-tax",
      prompt: "Show each order's **id** and its total with 18% GST added, rounded to the paisa, in a column called `with_tax`.",
      starter: "SELECT id, total\nFROM orders;",
      hint: "Multiply the total by 1.18, then wrap it in ROUND(…, 2) and name it with AS.",
      solution: "SELECT id, ROUND(total * 1.18, 2) AS with_tax\nFROM orders;",
      ordered: false,
      namedColumns: ["id", "with_tax"],
    },
  ],
  buildsOn: [],
  cheatsheet: [
    { heading: "Read columns", text: ["`SELECT name, price FROM products;` returns those two columns for every row.", "`SELECT * FROM products;` returns every column: good for a look, not for code."] },
    { heading: "Rename and work out values", text: ["`total AS amount` renames a column in the result.", "`ROUND(total * 1.18, 2) AS with_tax` works out a new value for every row."] },
    { heading: "The order Postgres works in", text: ["FROM comes first: Postgres reads the table. Then SELECT keeps the columns you named."] },
  ],
};
