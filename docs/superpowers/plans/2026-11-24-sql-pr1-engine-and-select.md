# SQL subject, PR 1: engine, page and lesson 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /sql live with 21 lessons listed and lesson 1 (SELECT) working end to end: real Postgres in the browser, checked tasks, and a clause-by-clause replay of the learner's query.

**Architecture:** A framework-free `packages/sql` holds the shop seed, plain-word errors, result comparison, the task checker and the stage builder; all take a small `Db` interface, so the same code runs on PGlite in Node tests and in a browser Web Worker. Content adds a `SqlLesson` schema and `content/sql/*`; `apps/web/ui/sql` renders task lessons through the existing lesson route.

**Tech Stack:** PGlite (`@electric-sql/pglite` 0.6), `pgsql-ast-parser` 12, CodeMirror 6 (`@codemirror/state`, `view`, `commands`, `language`, `lang-sql`), Next.js 16, Vitest, zod.

**Spec:** `docs/superpowers/specs/2026-11-24-sql-subject-design.md`

## Global Constraints

- PostgreSQL syntax only; every frame and every check comes from running SQL in PGlite.
- Every run is wrapped in `BEGIN … ROLLBACK`; BEGIN, COMMIT, ROLLBACK, SAVEPOINT and END typed by the learner are refused with a plain message.
- A run longer than 3 s kills the worker; it is rebuilt from the seed.
- PGlite and CodeMirror load only on SQL pages (dynamic import inside client components / the worker).
- The last replay frame must equal the real result, or the replay is not shown.
- Lesson ids are `sql-<slug>`; slugs are the HLD's (`select`, `where`, `order-by`, `distinct`, `limit-offset`, `aggregates`, `group-by`, `having`, `case-when`, `inner-join`, `left-join`, `cte`, `row-number`, `insert`, `update`, `delete`, `create-table`, `alter-table`, `create-index`, `drop-table`, `truncate`).
- Hook titles ≤ 40 characters; prices in rupees; copy in plain words; Markdown only `**bold**` and `` `code` ``.
- Commits end with the session trailer; PR bodies end with the generated-with lines.

## Review Focus

1. A query with a syntax error, or an empty editor → a plain-word error, no replay, no crash (Task 3 test `reports a syntax error in plain words`).
2. A query that never finishes (`SELECT count(*) FROM generate_series(1, 1e12)`) → stopped after 3 s with "took longer than 3 seconds", next run works (Task 6 test `restarts after a timeout`).
3. `DELETE FROM orders` typed into a SELECT task → refused as the wrong kind of statement for this task, and the next run still sees all 60 orders (Task 3 test `a change never survives a run`).
4. A join with two `id` columns → both shown, labelled `c.id` and `o.id`, nothing lost (Task 4 test `labels clashing columns by table`).
5. Several statements in one run → the last one's result is checked and replayed (Task 3 test `checks the last statement`).

---

### Task 1: `packages/sql` and the Tintelix Shop seed

**Files:** Create `packages/sql/package.json` (deps: `@electric-sql/pglite`, `pgsql-ast-parser`), `packages/sql/src/db.ts`, `packages/sql/src/seed.ts`, `packages/sql/src/seed.test.ts`, `packages/sql/src/index.ts`; modify root `tsconfig.json` paths if packages are listed there, `apps/web/next.config.ts` transpilePackages, root `package.json` `test:content` to include `packages/sql`.

**Interfaces — Produces:**
- `interface Db { query(sql: string): Promise<{ fields: { name: string; dataTypeID: number }[]; rows: unknown[][]; affectedRows?: number }>; exec(sql: string): Promise<void> }` in `db.ts`, plus `pgliteDb(pg: PGlite): Db` (uses `rowMode: "array"`).
- `SHOP_SQL: string` (DDL + inserts) and `SHOP_TABLES: { name: string; columns: { name: string; type: string; note?: string }[] }[]` in `seed.ts`.
- `openShop(): Promise<Db>` (Node/tests: new PGlite, exec SHOP_SQL).

- [ ] Step 1: test `seed.test.ts`: after `openShop()`, counts are customers 20, products 15, orders 60, and order_items between 140 and 160; every order's total equals the sum of its lines' quantity × unit_price; at least 3 customers have no orders; at least 3 customers have a NULL city; at least 2 orders have a coupon and most don't; categories are exactly 4; `SHOP_TABLES` lists the 4 tables with the same columns as `information_schema.columns`.
- [ ] Step 2: run `npx vitest run packages/sql` → FAIL (module missing).
- [ ] Step 3: implement the seed with a fixed-seed PRNG (mulberry32, seed 2026) generating deterministic Indian names, cities (Pune, Surat, Mumbai, Ahmedabad, Bengaluru, Delhi, Chennai, Kochi, plus NULL), countries (mostly India, a few others), products in Electronics, Home, Books, Fitness with prices in rupees, orders across 2026-01-01..2026-10-31 with statuses placed/shipped/delivered/cancelled. Schema: customers(id serial PK, name text not null, email text unique not null, city text, country text not null, signed_up date not null); products(id PK, name, category, price numeric(10,2), stock int); orders(id PK, customer_id int references customers, ordered_at date, status text, total numeric(10,2), coupon text); order_items(order_id references orders, product_id references products, quantity int check > 0, unit_price numeric(10,2), PK(order_id, product_id)).
- [ ] Step 4: run → PASS. Step 5: commit.

### Task 2: plain-word errors and result comparison

**Files:** Create `packages/sql/src/errors.ts`, `errors.test.ts`, `compare.ts`, `compare.test.ts`.

**Interfaces — Produces:**
- `plainError(code: string | undefined, message: string): string` — mapped codes at least: 42601 syntax, 42703 unknown column, 42P01 unknown table, 42803 GROUP BY, 42883 unknown function/operator, 22012 divide by zero, 23505 duplicate key, 23502 NOT NULL, 23503 foreign key, 22P02 bad value, 42702 ambiguous column, 21000 subquery returned more than one row; anything else: "Postgres says: <message>".
- `interface ResultSet { columns: string[]; rows: unknown[][] }`
- `normalise(v: unknown): string` — numbers and numeric strings to a canonical decimal (`2499.00` → `2499`), Dates to ISO date, null/undefined to `NULL`, booleans to `true`/`false`.
- `type Feedback = { ok: true } | { ok: false; kind: "error" | "columns" | "rows" | "order" | "kind"; message: string; missing?: unknown[][]; extra?: unknown[][]; shouldBe?: number[] }`
- `compareResults(expected: ResultSet, actual: ResultSet, opts: { ordered: boolean; namedColumns?: string[] }): Feedback`

- [ ] Step 1: tests: 42803 maps to "Every column in SELECT must be in GROUP BY or inside a summary like SUM"; unknown code passes the message through; `normalise("2499.00") === normalise(2499)`; column count differs → kind "columns" naming expected and actual counts; named columns checked only when given; multiset rows (duplicates count) → missing/extra capped at 3 each; same rows wrong order with ordered → kind "order" and `shouldBe` = each actual row's index in the expected result (1-based); unordered with same rows in another order → ok.
- [ ] Step 2–4: fail, implement, pass. Step 5: commit.

### Task 3: running and checking a task

**Files:** Create `packages/sql/src/run.ts`, `run.test.ts`, `check.ts`, `check.test.ts`.

**Interfaces — Produces:**
- `type RunOutcome = { ok: true; result: ResultSet; command: string; rowCount: number; ms: number } | { ok: false; message: string; code?: string }`
- `splitStatements(sql: string): string[]` (via pgsql-ast-parser; falls back to one statement when parsing fails so Postgres reports the error).
- `runInRollback(db: Db, sql: string, after?: string): Promise<{ outcome: RunOutcome; after?: RunOutcome }>` — BEGIN, every statement, the last statement's result, then `after` (a verify query) inside the same transaction, then ROLLBACK (also on error). Refuses transaction control statements.
- `interface SqlTask { id: string; prompt: string; starter: string; hint: string; solution: string; answer?: string; ordered: boolean; namedColumns?: string[]; verify?: string; kind?: "read" | "change" | "define" }` (from `@tintelix/schema`, Task 5; define the zod schema there and import the type here).
- `checkSqlTask(db: Db, task: SqlTask, input: string): Promise<{ run: RunOutcome; feedback: Feedback }>` — read tasks compare the input's result with `answer ?? solution`; change/define tasks compare `verify` run after the input with `verify` run after the solution; a read task refuses INSERT/UPDATE/DELETE/DDL with kind "kind".

- [ ] Step 1: tests: `reports a syntax error in plain words` ("SELEC name FROM customers" → not ok, message starts "There's a typo"); empty input → "Write a query first"; `a change never survives a run` (run `DELETE FROM orders` then count orders = 60); `refuses transaction control` (`COMMIT` → message mentions "runs inside its own transaction"); `checks the last statement` ("SELECT 1; SELECT name FROM customers" checked against a names task → ok); a change task with verify passes for the solution and fails for an UPDATE without WHERE.
- [ ] Step 2–4. Step 5: commit.

### Task 4: the stage builder (clause-by-clause replay)

**Files:** Create `packages/sql/src/frames.ts`, `frames.test.ts`.

**Interfaces — Produces:**
- `type Clause = "FROM" | "WHERE" | "GROUP BY" | "HAVING" | "SELECT" | "DISTINCT" | "ORDER BY" | "LIMIT"`
- `interface Frame { clause: Clause; note: string; columns: string[]; rows: unknown[][]; marks?: ("pass" | "fail" | "unknown")[]; groups?: number[]; picked?: string[] }`
- `type Replay = { supported: true; frames: Frame[] } | { supported: false; reason: string }`
- `buildReplay(db: Db, sql: string): Promise<Replay>` — only for one SELECT with a FROM of tables and joins (no CTE, window function, subquery, set operation); runs every stage inside BEGIN … ROLLBACK; the last frame must equal the real result (normalised, same order), otherwise `{ supported: false, reason: "…" }`.
- Stages, in evaluation order, each only when the clause is present: FROM (all rows of the FROM, columns labelled `alias.col` when names clash), WHERE (FROM rows with `marks` from `(where) AS __pass`; NULL → "unknown"), GROUP BY (passing rows with `groups` = bucket index per row, rows sorted by bucket), HAVING (one row per group with marks), SELECT (the projection before DISTINCT/ORDER/LIMIT, `picked` = the column labels chosen), DISTINCT, ORDER BY, LIMIT. Aggregates without GROUP BY produce SELECT with one row. Notes in plain words with counts ("WHERE kept 23 of 60 rows; 4 had a NULL city, which is never equal to anything").

- [ ] Step 1: tests on the shop: `SELECT name, city FROM customers` → frames [FROM, SELECT], FROM has 20 rows and all columns, SELECT picks name and city; `… WHERE city = 'Pune'` → WHERE marks include "unknown" for NULL cities and the note says so; `GROUP BY customer_id` over orders → groups cover every passing row and the next frame has one row per customer; HAVING marks; ORDER BY + LIMIT 5 → last frame has 5 rows equal to the real result; `labels clashing columns by table` (orders o JOIN customers c → columns include `o.id` and `c.id`); a CTE query → `supported: false`; every built replay's last frame equals the real result.
- [ ] Step 2–4. Step 5: commit.

### Task 5: SqlLesson schema, the SQL subject and lesson 1

**Files:** Modify `packages/schema/src/` (new `sql.ts` exporting `SqlTask`, `SqlLesson` zod schemas, re-exported from the index); create `content/sql/subject.ts` (5 modules, 21 stubs with hook titles), `content/sql/select/lesson.ts`; modify `content/subjects.ts` (use the SQL subject), `content/index.ts` (`sqlLessons`, `getSqlLesson(slug)`, `lessonSummaries` availability counts SQL lessons), `content/content.test.ts`; create `content/sql/sql.content.test.ts`.

**Interfaces — Produces:**
- `SqlLesson = { id; home: "sql"; slug; topic; title; promise; minutes; level; explain: string[]; syntax: { code: string; notes: string[] }; mistake: string; tasks: SqlTask[] (3–5); buildsOn: string[]; cheatsheet: { heading; text: string[] }[] }`
- `sqlLessons: SqlLesson[]`, `getSqlLesson(slug: string): SqlLesson | undefined`.

- [ ] Step 1: tests: `lessonSummaries("sql")` has 21 entries in the HLD order with lesson 1 `{ id: "sql-select", order: 1, available: true, title: "Pick the columns you need" }` and 20 not available; the content test, for every SQL lesson: zod parse passes; 3–5 tasks; every starter runs without an error; every solution passes its own check; an ordered task's answer contains ORDER BY; every read task's solution replay is supported and its last frame equals the real result.
- [ ] Step 2–4. Lesson 1 tasks (read): list every product's name and price; list customers' names and cities with the columns in that order; give the total column the name `amount` (`total AS amount`); show each order's id with its total including 18% tax as `with_tax` (`ROUND(total * 1.18, 2)`). Mistake: `SELECT *` in real code. Step 5: commit.

### Task 6: the browser runtime

**Files:** Create `apps/web/ui/sql/sql.worker.ts`, `apps/web/ui/sql/client.ts`, `apps/web/ui/sql/client.test.ts`; add deps to `apps/web/package.json`.

**Interfaces — Produces:**
- Worker messages `{ id, op: "run" | "check" | "replay", sql, task? }` → `{ id, ok, data }`; the worker opens PGlite, runs `SHOP_SQL`, then serves `runInRollback`, `checkSqlTask`, `buildReplay`.
- `class SqlClient { constructor(makeWorker: () => Worker, timeoutMs = 3000); run(sql): Promise<RunOutcome>; check(task, sql): Promise<{ run; feedback }>; replay(sql): Promise<Replay>; dispose() }` — a call over `timeoutMs` terminates the worker, makes a new one and answers `{ ok: false, message: "That query took longer than 3 seconds, so it was stopped." }`.

- [ ] Step 1: `client.test.ts` with a fake Worker: `restarts after a timeout` (a fake that never answers → timeout message, a second Worker created, the next call answered); answers are matched by id when they arrive out of order.
- [ ] Step 2–4. Step 5: commit.

### Task 7: the task-lesson page

**Files:** Create `apps/web/ui/sql/SqlLessonView.tsx` (client), `QueryEditor.tsx`, `Replay.tsx`, `ResultTable.tsx`, `FeedbackCard.tsx`, `DatasetCard.tsx`, `sql.css`, tests `Replay.test.tsx`, `FeedbackCard.test.tsx`; modify `apps/web/app/[subject]/[slug]/page.tsx` (static params and render for SQL lessons), the cheatsheet page (SQL lessons: syntax card, mistake and cheatsheet), `apps/web/ui/SubjectCard.tsx` and `apps/web/app/[subject]/page.tsx` (open when the subject has written lessons), `apps/web/next.config.ts` (transpile `@tintelix/sql`).

**Interfaces — Consumes:** `SqlClient`, `Replay`, `Feedback`, `RunOutcome`, `SqlLesson`. **Produces:** progress keys `pref "sql-tasks:<lessonId>" = string[]` and `saveStep(lessonId, solved, total)`.

- [ ] Step 1: `Replay.test.tsx`: given frames, shows the clause chips FROM → … in evaluation order with the current one marked, the note, the rows (WHERE marks as classes), and steps forward/back; `FeedbackCard.test.tsx`: renders each Feedback kind (error, columns, rows with missing/extra examples, order with "should be" ranks) and the ok state ("Task solved").
- [ ] Step 2–4. The view: header as other lessons; left column explanation, syntax card, the task list (current task, done ticks), mistake note, Hint, Show solution after the first run; right column replay, editor (starter loaded; Ctrl/Cmd+Enter runs), run status ("12 rows · 34 ms · runs in your browser"), feedback, result table, dataset card (tables and columns from `SHOP_TABLES`), Next task. Runs: `check` for the current task, then `replay` of the input; first load replays the starter. Phone: one column.
- [ ] Step 5: commit.

### Task 8: verify and ship

- [ ] `pnpm check` green; `pnpm --filter web build` green (fix PGlite bundling here if needed: worker `new URL("./sql.worker.ts", import.meta.url)`; PGlite in `serverExternalPackages` if the server bundle trips on it).
- [ ] Smoke flow `sql_flow` in `apps/web/e2e/lesson_smoke.py`: /sql lists 21 lessons with 1 open; /sql/select loads, the starter's replay shows FROM then SELECT, a wrong query gets the columns feedback, the solution ticks task 1; subject-page counts updated ("System Design lists 59 …" unchanged; home shows SQL open).
- [ ] Screenshots desktop and phone, both themes; fix what looks wrong.
- [ ] Commit, push, PR "SQL: engine, task-lesson page and lesson 1 (SELECT)".

## Recipe for lessons 2–21 (one PR each, stacked)

1. Branch from the previous lesson's branch: `sql-<NN>-<slug>`.
2. Write the lesson's content test expectations first (they run automatically for every SQL lesson): add the lesson to `sqlLessons`, see the content test fail for missing tasks.
3. Write `content/sql/<slug>/lesson.ts`: explain (2–3 short paragraphs), syntax card, the HLD's animation idea reflected in the tasks, 3–5 tasks, mistake, cheatsheet, hook title on the stub.
4. If the replay can't stage the lesson's statement yet (CTE, window function, INSERT/UPDATE/DELETE, DDL, TRUNCATE), extend `frames.ts` test-first: CTE → a frame for the named result, then the main query's frames over it; ROW_NUMBER → partitions as groups, sorted, numbered; INSERT/UPDATE/DELETE → table before with marks, table after; CREATE/ALTER/DROP/TRUNCATE/CREATE INDEX → the table's columns or rows before and after.
5. Smoke: extend `sql_flow` with the lesson's first task; bump open counts.
6. `pnpm check`, build, screenshots, design note, commit, push, PR stacked on the previous one, ledger line.
