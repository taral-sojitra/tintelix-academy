# Indexing lesson ("Stop reading every row")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 13 of System Design, from *Vintelix System Design 101* Chapters 36 and 42: a full scan reads every page; a B+ tree reaches any row in a few levels; ranges walk the linked leaves and a covering index skips the table; every index taxes every insert (§42.7's 20,000 → 10,000 → 6,700 → 4,000 inserts a second).

**Approach (my call).** An `index` scene: app → (index, from step 2) → the orders table drawn as a 10 × 10 grid of pages. The scan sweeps an amber cursor across every page. A lookup lights the root, one inner node and one leaf, then one page. A range lights three neighbouring leaves, then a run of ten pages. In the write step the index panel becomes a list of index chips that pulse on each insert, and the chart shows inserts a second.

**Model.** Pages = rows ÷ 100; scan time = pages × 0.1 ms (10 s for 10 M rows). Depth = ⌈log(rows) ÷ log(100)⌉ (4 for 10 M, 5 for 1 B); a lookup reads depth + 1 pages (0.5 ms, 20,000× faster). Range of 1,000 rows: depth + 10 leaves + 1,000 row fetches = 1,014 pages (101 ms); covering: 14 pages (1 ms). Inserts a second = 1,000,000 ÷ (50 µs × trees).

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | full-scan | Every query reads every row | 100,000 pages, 10 s; Try it: table size |
| 2 | b-tree | A B+ tree jumps straight there | 4 levels, 5 pages, 0.5 ms, 20,000× |
| 3 | range | Ranges walk the linked leaves | 1,014 pages, 101 ms; covering 1 ms |
| 4 | write-tax | Every index taxes every write | 5 trees, 4,000 inserts a second (80% less); Try it: extra indexes |
| 5 | recap | What indexes taught us | points to Replication |

**Left to the build.** Which leaf and page light up is visual only; every number comes from the model.
