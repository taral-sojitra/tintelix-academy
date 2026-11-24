import type { Subject } from "@tintelix/schema";

const l = (slug: string, topic: string, title: string, summary: string, buildsOn: string[] = []) => ({
  id: `sql-${slug}`, slug, topic, title, summary, buildsOn: buildsOn.map((b) => `sql-${b}`),
});

/** The 21 SQL lessons in five modules (HLD §SQL). Every query runs in a real Postgres in the browser. */
export const sql: Subject = {
  id: "sql",
  title: "SQL",
  blurb: "Real queries against a real Postgres, running in your browser.",
  phase: 3,
  modules: [
    {
      title: "Reading rows",
      lessons: [
        l("select", "SELECT", "Pick the columns you need", "The table appears whole, then only the columns you name stay lit."),
        l("where", "WHERE", "Only the rows that match", "Each row is tested and the losers fade; a comparison with NULL is never true.", ["select"]),
        l("order-by", "ORDER BY", "Who comes first?", "Rows slide into order; ties stay in any order until you add a second key.", ["select"]),
        l("distinct", "DISTINCT", "Every city, once", "Duplicate rows fold into one.", ["select"]),
        l("limit-offset", "LIMIT and OFFSET", "The top five, then the next", "Sorted rows are cut to a page; OFFSET skips the first ones.", ["order-by"]),
      ],
    },
    {
      title: "Summarising",
      lessons: [
        l("aggregates", "COUNT, SUM, AVG", "How many, how much?", "Rows fold into one number; COUNT(*) counts rows while COUNT(column) skips NULLs.", ["select"]),
        l("group-by", "GROUP BY", "Who spends the most?", "Rows drop into buckets, then each bucket folds into one row.", ["aggregates"]),
        l("having", "HAVING", "Only the big spenders", "Whole groups are tested after they're summed.", ["where", "group-by"]),
        l("case-when", "CASE WHEN", "Label every order", "Each row takes its label from the first rule it matches.", ["select"]),
      ],
    },
    {
      title: "Combining tables",
      lessons: [
        l("inner-join", "INNER JOIN", "Whose order is this?", "Each order finds its customer; rows without a match vanish.", ["select"]),
        l("left-join", "LEFT JOIN", "Who never ordered?", "Every customer stays; a missing match is filled with NULL.", ["inner-join"]),
        l("cte", "WITH (CTE)", "Name a step, use it later", "A named step's result appears first, then the main query reads from it.", ["group-by"]),
        l("row-number", "ROW_NUMBER() OVER", "Each customer's latest order", "Rows split by customer, sort by date and get numbered; keep number 1.", ["order-by", "group-by"]),
      ],
    },
    {
      title: "Changing data",
      lessons: [
        l("insert", "INSERT INTO", "Add a new product", "A new row slides in; a duplicate key is turned away.", ["select"]),
        l("update", "UPDATE", "Change some rows, not all", "Matching rows change; forget WHERE and every row does.", ["where"]),
        l("delete", "DELETE", "Remove only what you mean", "Matching rows fade out, and WHERE decides which.", ["where"]),
      ],
    },
    {
      title: "Defining tables",
      lessons: [
        l("create-table", "CREATE TABLE", "Make a new table", "An empty table appears with your columns and their rules."),
        l("alter-table", "ALTER TABLE", "Add a column later", "A column joins a table that already has rows.", ["create-table"]),
        l("create-index", "CREATE INDEX", "Find it without reading all", "A sorted lookup beside the table lets WHERE skip the full scan.", ["where"]),
        l("drop-table", "DROP TABLE", "Gone, and what goes with it", "The table disappears; CASCADE takes the views that depend on it.", ["create-table"]),
        l("truncate", "TRUNCATE", "Empty it in one go", "Every row goes at once, but the table stays.", ["delete"]),
      ],
    },
  ],
};
