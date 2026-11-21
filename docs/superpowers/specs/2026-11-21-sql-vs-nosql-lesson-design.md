# SQL vs NoSQL lesson ("Tables or documents?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 12 of System Design (first of Data storage), from *Vintelix System Design 101* Chapters 35 and 40: the same orders stored as normalized tables and as documents, and which reads, changes and checks each makes cheap. Pick by access pattern, not by which one "scales".

**Approach (my call).** A `data` scene with the relational side on top (orders → order_items → products, joined hop by hop) and the document side below (an orders collection showing a JSON preview). The rename step swaps in a sellers table and a listings collection whose rewrite plays out in real seconds, with a progress bar and a "listings left to rewrite" chart. The schema step sends writes, some missing a currency: the table rejects them (red) and the collection stores them (amber).

**Model.** Showing an order with 3 items: 1 + 2 × items = 7 rows across 3 tables (2 joins), against 1 document read. A rename: 1 row in sellers, against one write per listing (20,000 at 2,000 writes a second = 10 s, §40.3); the time since the rename drives progress. Flexible schema: 5% of 10,000 orders a day = 500 stored without a currency, against 0 stored (rejected at once).

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | tables | One order across three tables | 7 rows, 3 tables, 2 joins |
| 2 | documents | The whole order in one document | 1 read |
| 3 | rename | A seller changes their name | 1 row against 20,000 writes, 10 s; Try it: listings |
| 4 | schema | A flexible schema moves the checks | 500 bad orders a day stored; 0 in tables |
| 5 | recap | What tables and documents taught us | key-value and graph in a line; points to Indexing |
