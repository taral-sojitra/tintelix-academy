# SQL lessons: notes per lesson

The subject design (`2026-11-24-sql-subject-design.md`) and the HLD fix each lesson's topic, animation and builds-on.
These notes record what each lesson's tasks teach and any call made while writing it. Starters always run; most are
deliberately wrong in the way the lesson is about, so the first run's feedback teaches.

## 2. WHERE: Only the rows that match

- Tasks: a text test (Fitness products), a number test (orders over ₹10,000), the `= NULL` trap (starter returns
  nothing; the replay shows all 20 rows dropped at WHERE), and AND-before-OR (starter returns 15 rows; brackets or
  IN give 10).
- Call: the precedence task uses IN in its solution; brackets pass too, since the checker compares results.

## 3. ORDER BY: Who comes first?

- Tasks: cheapest first with a name tiebreaker, newest first with id DESC on the same day, three tied prices broken by
  stock, NULL cities moved to the top with NULLS FIRST, and sorting by an AS name. Every starter returns the right
  rows in the wrong order, so the feedback ranks each row.
- New build checks for all lessons: an ordered task's answer must sort to one order only (`sortTies` counts rows that
  tie on every key; it must be 0), and a starter must not already pass. The first closes the gap where a right
  answer could fail because tied rows came back in another order.

## 4. DISTINCT: Every city, once

- Tasks: categories once each; cities without the missing ones (the starter's DISTINCT keeps one NULL row, so it has
  one row too many); country and city pairs (DISTINCT covers every listed column); customer ids that ordered, sorted.
- The mistake note warns against DISTINCT as a cover for repeats a join caused, which lesson 10 comes back to.

## 5. LIMIT and OFFSET: The top five, then the next

- Tasks: top three by price; the five latest orders (the starter's LIMIT without ORDER BY gets the five oldest);
  page 2 at four a page; the 4th to 6th biggest orders. Solutions carry tiebreakers so the no-ties check passes, even
  where the learner's top rows don't tie.

## 6. COUNT, SUM, AVG: How many, how much?

- Tasks: count customers; customers and those with a city (`count(*)` against `count(city)`); revenue of delivered
  orders (WHERE runs before the sum); cheapest, dearest and average price; orders with a coupon and different coupons
  (`count(coupon)`, `count(DISTINCT coupon)`).
- Replay: a summary over a column now says how many NULLs it skipped ("count(city) skipped 4 NULLs"), the HLD's
  point for this lesson.
- Feedback: a one-row answer with the wrong value now reads "One row, as expected, but its values are different."

## 7. GROUP BY: Who spends the most?

- Tasks: orders per status; products and stock per category; spend per customer without cancelled orders, biggest
  first (the HLD mock-up's hook); orders per month (the starter groups by day, 55 groups instead of 10); customers per
  country and city, where missing cities form their own group.
- Call: the first starter is `SELECT status FROM orders`, not the erroring `SELECT status, count(*)`, because the HLD
  says starters always run. The hint invites the learner to try count(*) without GROUP BY and read the plain-word
  error, and the content check now enforces "starters run" for every lesson.

## 8. HAVING: Only the big spenders

- Tasks: customers with 4+ orders; categories holding over 300 items; big spenders over ₹20,000 without cancelled
  orders (the starter counts cancelled ones, so a WHERE is missing, not a HAVING); statuses with more than 10 orders.
- Errors: `WHERE count(*) > 3` now says summaries belong in HAVING (it shares Postgres's grouping-error code, which
  had produced the GROUP BY message). An unknown column that is an AS name in the query, as in `HAVING spent > …`,
  now explains that WHERE and HAVING run before SELECT names columns.

## 9. CASE WHEN: Label every order

- Tasks: size labels on orders; price bands where the starter's broad rule comes first (four products land in the
  wrong band); a place label where the starter repeats lesson 2's `= NULL` trap inside CASE; counting delivered and
  cancelled orders in one row with `count(CASE … END)`; a custom sort order with CASE in ORDER BY.

## 10. INNER JOIN: Whose order is this?

- Tasks: each order with its customer's name; Pune customers' orders (WHERE after JOIN); order 19's lines with product
  names; customers with a cancelled order, where the starter joins `c.id = o.id`; revenue per category across
  order_items and products.
- Replay: the FROM frame of a join now says which rows had no match and were left out ("5 rows of customers had no
  match"); for the wrong-join starter it reads "40 rows of orders had no match", which shows the bug. Outer joins say
  which rows they kept with NULLs and mark them (used in lesson 11).

## 11. LEFT JOIN: Who never ordered?

- Tasks: every customer with their order ids (the starter's inner join loses five customers); customers who never
  ordered (`WHERE o.id IS NULL`); orders per customer with 0 for none (the starter's `count(*)` gives 1); delivered
  orders per customer keeping everyone (the starter's WHERE on the right table undoes the LEFT JOIN; the replay's
  WHERE note shows the 5 NULL rows dropped).
- The FROM frame marks NULL-filled rows in violet.

## 12. WITH (CTE): Name a step, use it later

- Tasks: big spenders read from a `spend` step (WHERE on a summary that is now a column); customers above the overall
  average via a second step and CROSS JOIN; the three best months without cancelled orders; a step joined to
  customers.
- Replay: WITH is now followed. Each step gets its own frame (chip "WITH spend") with its rows, then the main query's
  frames run inside the same WITH. WITH RECURSIVE still shows only the result. Join notes count matches with `ctid`,
  which only real tables have, so they're skipped when a step is joined.

## 13. ROW_NUMBER() OVER: Each customer's latest order

- Tasks: number each customer's orders newest first; the latest order per customer (number in a WITH step, keep
  n = 1); rank() so tied prices share a rank (the starter's row_number splits them); a running total (the starter's
  `OVER ()` puts the grand total on every row); the two dearest products per category.
- Replay: window functions in the SELECT list are now followed. A new OVER frame shows the rows split into
  partitions (coloured like GROUP BY buckets), sorted the way the window sorts them, with the window's column, and says
  what it did ("numbered the rows from 1 in each group", "ranked them; ties share a rank", "worked out a running sum").
  A window anywhere else still shows the result only.
- Error: a window function in WHERE (42P20) now says to number in a WITH step and filter in the main query.

## 14. INSERT INTO: Add a new product

- Tasks (change tasks, checked by a verify query after the learner's statement and after the solution): add Desk Mat;
  two rows in one statement; Phone Stand where the starter leaves out the column list and swaps name and category;
  a new customer (the prompt invites trying id 1 to see the duplicate key turned away, since starters must run);
  `INSERT … SELECT` to read the Yoga Mat's price.
- Replay: INSERT, UPDATE and DELETE are now followed (`changes.ts`). The table before (or the rows WHERE picks), then
  the table after with new, changed or deleted rows marked, matched by `RETURNING ctid` and sorted by primary key.
  When the editor holds several statements, the earlier ones run first and the last is replayed, so a CREATE TABLE
  followed by an INSERT replays the INSERT. Statement text is sliced by start positions, because the parser's end
  positions can drop a closing bracket.
- The page now asks for a replay for every task kind; the content check requires change-task solutions to replay.

## 15. UPDATE: Change some rows, not all

- Tasks: restock the Spice Box (the starter has no WHERE; the replay warns "There's no WHERE, so UPDATE changes every
  row: all 15"); raise Books prices 10% rounded; two columns in one SET; fill missing cities (the starter's `= NULL`
  changes nobody, and the replay says 20 hit a NULL); AND instead of OR.
- Feedback: when a change leaves the same number of rows wrong on both sides, it now reads "After your statement,
  14 rows don't look the way they should." instead of "14 rows missing and 14 that shouldn't be there".

## 16. DELETE: Remove only what you mean

- Tasks: delete a customer who never ordered (the starter only SELECTs); order 58's lines (the starter tests
  product_id and deletes nothing); every cancelled order, lines first then orders, two statements in one run (the
  prompt invites deleting the orders alone to see Postgres refuse); USB-C lines only from cancelled orders.
- Error: a delete blocked by a foreign key now says "Rows in order_items still point at the orders rows you're
  removing. Delete or change those first."; an insert or update pointing at nothing names the table and constraint.

## 17. CREATE TABLE: Make a new table

- Tasks build coupons step by step (columns; PRIMARY KEY and NOT NULL; a CHECK and a date column), then reviews with a
  REFERENCES link and a CHECK, then coupons created and filled in one run.
- Checking: `describeTable(name)` (in `@tintelix/sql/tables`, which content can import without pulling in PGlite) is
  the verify query. It lists each column's name, type, NOT NULL and the kinds of constraint on it, so
  `CHECK (x BETWEEN 1 AND 5)` and `CHECK (x >= 1 AND x <= 5)`, or serial and an identity column, compare equal.
  Feedback on a table definition speaks of columns.
- Replay: CREATE TABLE gets a frame listing the new table's columns, types and rules in SQL words ("PRIMARY KEY,
  counts up by itself", "NOT NULL, REFERENCES products(id)"). The content check now requires every task's solution
  to replay, define tasks included. Error: an unknown type names it and lists common ones.

## 18. ALTER TABLE: Add a column later

- Tasks: a discount column with DEFAULT 0 (the starter leaves the 15 rows NULL); a required loyalty_points column (the
  prompt invites NOT NULL without a default to see the refusal); rename signed_up; drop orders.coupon; a CHECK that
  price is above 0, checked against existing rows.
- Replay: ALTER TABLE shows the columns before (dropped ones marked), the columns after (new and changed ones
  marked), then the rows after with what a new column got ("All 15 rows got discount = 0.00." or "All 20 rows have NULL
  in points, because it has no default."). Renamed columns are matched to their old names.
- Error: NOT NULL on a new column of a table with rows now says to give it a DEFAULT.

## 19. CREATE INDEX: Find it without reading all

- Tasks: index customers' city (the starter is the slow lookup); a two-column index in the right order; an
  expression index on lower(email); a UNIQUE index on product names.
- Checking: `describeIndexes(table)` lists each non-primary index's keys (from `pg_get_indexdef`, so expressions
  count), whether it's UNIQUE and whether it's partial; index names don't matter. Feedback speaks of indexes.
- Replay: CREATE INDEX shows the table in stored order ("Without an index, a WHERE on city reads all 20 rows…"),
  then the index's entries sorted by its keys, each pointing at its row's primary key.

## 20. DROP TABLE: Gone, and what goes with it

- Tasks make their own tables first (every run starts from a fresh shop): drop coupons; drop coupons and its view
  with CASCADE (the prompt invites the plain refusal); drop only the view; drop products with CASCADE, which removes
  order_items' link but keeps order_items (the starter is a harmless DROP TABLE IF EXISTS).
- Checking: `describeRelations()` lists the tables and views and how many links each has; feedback speaks of tables.
- Replay: DROP TABLE and DROP VIEW list the tables and views before (what goes is marked) and after, and say what
  CASCADE also removed, including links from tables that stay; IF EXISTS on a missing table says nothing changed.
- Engine: the replay now splits the editor's text with the checker's string- and comment-aware splitter, runs the
  earlier statements as plain text and parses only the last, so a statement the parser can't read no longer stops the
  replay. DROP VIEW, which the parser can't read at all, is matched by pattern.
- Error: Postgres's refusal to drop a table now names what depends on it (from the error's detail).
