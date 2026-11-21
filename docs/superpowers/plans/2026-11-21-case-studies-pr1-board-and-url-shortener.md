# Case studies PR 1: design board and the URL shortener — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a data-driven `board` scene kind with a small widget library, list lessons 31–59 as stubs in five new modules, and ship lesson 32, "Design a URL shortener", as the pilot.

**Architecture:**
- **Schema:** a case study's scene spec carries an optional `board` block: flows, modes, widgets, tiles, node states and subtitles. `checkContent` validates it.
- **Stage:** one generic `board` router and scene runtime play any board.
- **Widgets:** generic ones (text, meter, cells, bars, chips, log), plus named custom widgets (the pilot adds `base62`).
- **Lessons:** each lesson stays data plus a pure model, as now.

**Tech Stack:** TypeScript, zod (schema), Vitest + jsdom, Next.js 16 app, Python Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-21-case-studies-module-design.md`

## Global Constraints

- **Honesty:** every number on screen comes from the lesson's model; anything exaggerated (packet shares, speed) is labelled in the legend, live tag or step note.
- **Sources:**
  - Use *Vintelix System Design 101* and public primary sources.
  - Nothing from `liquidslr/system-design-notes` or Alex Xu's books: no text, figures or worked-example numbers.
- **Titles:** hook titles are 40 characters at most (`MAX_TITLE`); the topic tag reads "Design a …".
- **Format:**
  - Rates must not end in `Sec`, which formats as a duration.
  - Percentages end in `Pct` and run 0–100.
- **Stage layout:** the new lesson passes `apps/web/e2e/stage_audit.py` at desktop and phone sizes.
- **Branch:** `case-studies-board`, stacked on #32. Commits end with the session's Co-Authored-By / Claude-Session lines.

## Review Focus

1. A step sets `mode` past the last board mode: the board plays the last mode, and `checkContent` reports it (Tasks 1 and 4).
2. A flow's weight comes from an output that is 0, negative or missing: that flow sends nothing, and if every weight is 0 no packets spawn (Task 2).
3. A flow passes through a node that is hidden in this step: the flow is skipped, so packets never travel into an invisible box (Task 4).
4. A failure share named in a flow isn't a `…Pct` output: `checkContent` rejects it, so a fraction can't be read as a percentage (Task 1).
5. A board template quotes an output missing from a mode: `checkContent` runs the model once per mode and reports it (Task 1).

---

### Task 1: Board schema and content checks

**Files:**
- Create: `packages/schema/src/board.ts`
- Modify: `packages/schema/src/lesson.ts` (SCENE_KINDS += `"board"`; SCENE_MODES `board: ["none", "steady"]`; `SceneSpec.board: Board.optional()`)
- Modify: `packages/schema/src/check.ts`
- Modify: `packages/schema/src/index.ts` (export Board types)
- Test: `packages/schema/src/check.test.ts`

**Interfaces:**
- Produces, from `board.ts`:
  - **Shared fields:**
    - `Hue = "cyan"|"green"|"amber"|"violet"|"red"`
    - `Cond = { output: string; above?: number; below?: number }`
  - **Flows:** `BoardFlow = { path: { wire: string; dir: 1|-1; at: string }[]; color: Hue; back?: Hue; small?: boolean; fail?: { at: string; share: string /* …Pct output */ }; float?: { at: string; text: string; color: Hue; chance: number } }`
  - **Tiles:** `BoardTile = { id: string; label: string; icon: string; hue: "cyan"|"green"|"violet"|"blue"|"amber"; value: string; note: string; mood?: "good"|"bad"|""; moodIf?: Cond & { mood: "good"|"bad" } }`
  - **Widgets:** `BoardWidget` is a union on `kind`:
    - `{ kind: "text"; text: string; when?: Cond }`
    - `{ kind: "meter"; output: string; max: number; text?: string }`
    - `{ kind: "cells"; output: string; total: number; cols?: number }`
    - `{ kind: "bars"; rows: { label: string; output: string; max: number }[] }`
    - `{ kind: "chips"; items: string[] }`
    - `{ kind: "log"; lines: { text: string; when?: Cond }[] }`
    - `{ kind: "custom"; name: string }`
  - **Modes:** `BoardMode = { flows: { flow: string; weight: number | string }[]; rate?: number; tiles: BoardTile[] }`
  - **Board:** `Board = { legend: [string, string][]; chart?: { label: string; output: string; max: number; danger: number }; flows: Record<string, BoardFlow>; modes: BoardMode[]; widgets?: Record<string, BoardWidget[]>; states?: { node: string; cls: "tx-down"|"tx-hot"|"tx-stale"|"tx-lead"|"tx-cand"; when: Cond }[]; subs?: Record<string, string> }`
  - `testCond(c: Cond, outputs: Outputs): boolean`, exported for the stage.
- Consumes: the existing `fillOutputs`, `quotedOutputs` and `SceneSpec`.

- [ ] **Step 1: Write the failing tests** in `check.test.ts`. Build a minimal board lesson (`boardLesson()`: users→app→db, model echoing `mode`, `dbBusyPct`, `failPct`) and assert:
  - `board scene: a valid board passes` → `checkContent(...)` returns `[]`
  - `board: flow names an unknown wire` → contains `"flow read uses unknown wire nope"`
  - `board: flow reaches an unknown node` → contains `"flow read reaches unknown node ghost"`
  - `board: failure share must be a Pct output` → `fail.share = "failShare"` reports `"fail share failShare must be a …Pct output"`
  - `board: a step's mode has no board mode` → step `model: { mode: 3 }` with 2 modes reports `"step s sets mode 3; the board has 2 modes"`
  - `board: a template quotes a missing output` → tile value `"{nope}"` reports `"board mode 0 quotes {nope}, which the model does not produce"`
  - `testCond` → `testCond({ output: "x", above: 1 }, { x: 2 }) === true`; with `{ x: 1 }` it is `false`
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run packages/schema/src/check.test.ts`. Expected: FAIL, with `board.ts` not found.
- [ ] **Step 3: Implement `board.ts` (zod) and the board rules in `checkContent`.** They run only when `lesson.scene.board` is present:
  - wires and `at` nodes exist;
  - `fail.share` ends with `Pct`;
  - each step's `model.mode` (defaulting to the model default) is less than `modes.length`;
  - every `{output}` in tiles, widgets, subs, floats and the legend exists when the model runs at that mode index (`run({ ...defaults, mode: i })`).
- [ ] **Step 4: Run the tests and watch them pass.** Run: `npx vitest run packages/schema`. Expected: PASS.
- [ ] **Step 5: Commit** as `feat(schema): board scene spec and its content checks`.

### Task 2: Board router

**Files:**
- Create: `packages/stage/src/routers/board.ts`
- Test: `packages/stage/src/routers/board.test.ts`

**Interfaces:**
- Consumes: `BoardFlow` (Task 1); the `Router` and `Sim` APIs.
- Produces: `board(state: BoardRouterState): Router`, where `BoardRouterState = { flows(): { id: string; flow: BoardFlow; weight: number }[]; failShare(output: string): number /* 0..1 */ }`.
- **Events:**
  - `pass` at each `at` node;
  - `miss` at `fail.at` on failure, returning red along the reversed path;
  - `reply{hit}` at the start node when the packet comes back;
  - a flow with no `back` ends at its last node (emits `pass`, then dies).
- **Leg ends:** `"hop:<i>"` going out and `"ret:<i>"` coming back. Ends are matched exactly, never with `startsWith`.

- [ ] **Step 1: Write the failing tests:**
  - `sends packets along the flow's path and back` → with one flow (`back: "green"`), `pass` counts at app and db each equal the spawns, and every reply is a hit.
  - `splits traffic by weight` → weights 3:1 give roughly 75% (±10%) of spawns to the first flow over 30 s at 10/s.
  - `a zero or negative weight sends nothing; all zero spawns nothing` → no events on that flow; `sim.packets` is empty.
  - `fails the share the model gives, at the named node` → `failShare` 0.5 gives misses at db of 50% ±12% and red replies (`hit: false`).
  - `a one-way flow stops at its last node` → no replies.
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run packages/stage/src/routers/board.test.ts`. Expected: FAIL, with the module missing.
- [ ] **Step 3: Implement `board()`.** It picks a flow by cumulative weight (weights ≤ 0 or NaN count as 0), and keeps per-packet state in a `Map<number, {flow, hop}>`.
- [ ] **Step 4: Run the tests and watch them pass.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(stage): board router`.

### Task 3: Widget library and the base62 widget

**Files:**
- Create: `packages/stage/src/board/widgets.ts`
- Create: `packages/stage/src/board/base62.ts`
- Modify: `packages/stage/src/stage.css` (only for the base62 layout; the others reuse `.tx-meter`, `.tx-cells`, `.tx-budget`/`.tx-brow`, `.tx-chips`, `.tx-log`, `.tx-calc-s`)
- Test: `packages/stage/src/board/widgets.test.ts`

**Interfaces:**
- Produces:
  - `widgetHtml(w: BoardWidget, key: string): string`, which puts `data-w="<key>"` on the widget's root;
  - `paintWidget(root: HTMLElement, w: BoardWidget, d: Outputs, clock: number): void`;
  - `CUSTOM: Record<string, { html(key: string): string; paint(root: HTMLElement, d: Outputs, clock: number): void }>`;
  - `toBase62(n: number, width: number): string`, using the alphabet `0-9a-zA-Z`, zero-padded on the left.
- **`base62` paint behaviour:**
  - It reads the outputs `idStart`, `writeRate` and `codeLength`.
  - It shows the current id (`idStart + floor(clock × writeRate)`, grouped with commas) and that id's code.
  - Text: `"#61,999,999,999 → <code>"` and `"{codeLength} characters"`.

- [ ] **Step 1: Write the failing tests** (jsdom):
  - `toBase62` → `toBase62(0, 7) === "0000000"`, `toBase62(61, 1) === "Z"`, `toBase62(62, 2) === "10"`, `toBase62(3521614606207, 7) === "ZZZZZZZ"`
  - `meter widget fills to output/max` → `width === "50%"` for 2,500 of 5,000, clamped to 100% above max.
  - `text widget fills outputs and hides when its condition is false`
  - `cells widget lights the output's count of cells` → 9 of 10 `.on`
  - `log widget shows only lines whose condition holds`
  - `base62 widget shows the id and its code, advancing with the clock`
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run packages/stage/src/board/widgets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `widgets.ts` and `base62.ts`.
- [ ] **Step 4: Run the tests and watch them pass.** Expected: PASS.
- [ ] **Step 5: Commit** as `feat(stage): board widget library and base62 widget`.

### Task 4: Board scene runtime

**Files:**
- Create: `packages/stage/src/scenes/board.ts`
- Modify: `packages/stage/src/scenes/index.ts` (`board: createBoardScene`)
- Test: `packages/stage/src/scenes/board.test.ts`, using a small test board defined in the test file

**Interfaces:**
- Consumes: Tasks 1–3, the `SceneRuntime` contract, and `fillOutputs`.
- Produces: `createBoardScene(o: { fx; rand; scene: SceneSpec }): SceneRuntime`.
- **Clock:** `liveInputs` adds `elapsedSec` from a scene clock that resets on `enterStep` and on any input change.
- **Mode selection:** the mode is `clamp(round(live().mode), 0, modes.length - 1)`. `update` sets `sim.ratePerSec = mode.rate ?? 3`.
- **Flows:** a flow is offered only while every node on its path is visible (`ctx.visible`).
- **Wires:**
  - in an active flow: `blue`, alpha 0.42, width 2;
  - in another mode's flow whose nodes are all visible: `blue`, alpha 0.14;
  - otherwise not drawn.
- **Events:** `pass` pings the node (sets the `--ping` CSS variable, decaying at 5 per second); a flow's `float` fires on arrival at its node with probability `chance`.
- **Painting:**
  - tiles are filled from the display outputs;
  - `subs` replace node subtitles;
  - `states` toggle node classes;
  - widgets are painted from live outputs.
- **Chart:** the chart box is hidden when the board has no chart.

- [ ] **Step 1: Write the failing tests:**
  - `tiles fill from the mode` → `advance(0.5)` returns the mode 0 tile values.
  - `a mode past the last plays the last mode`
  - `flows through hidden nodes are skipped` → with the cache hidden, the router's `flows()` excludes `readCached`.
  - `states and subs follow the model` → db gets `tx-down` when `dbBusyPct` > 100; the subtitle text is filled.
  - `widgets render in their node and repaint`
  - `the chart is hidden when the board has none`
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run packages/stage/src/scenes/board.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `createBoardScene`** and register it.
- [ ] **Step 4: Run the stage tests and watch them pass.** Run: `npx vitest run packages/stage`. Expected: PASS.
- [ ] **Step 5: Commit** as `feat(stage): board scene runtime`.

### Task 5: Stubs for modules 9–13

**Files:**
- Modify: `content/system-design/subject.ts` (doc comment: "59 lessons in thirteen modules")
- Modify: `content/content.test.ts` (30 → 59)
- Modify: `apps/web/e2e/lesson_smoke.py` ("Lesson 1 of 30" → "of 59"; "30 of 30 open" → "31 of 59 open"; "30 open now" → "31 open now"; the return text to match)

**Interfaces:**
- **Produces:** 29 stubs with exact ids, used by later tasks and lessons:
  - **Module 9, "Case studies: the method and the classics":** `design-method`, `url-shortener`, `unique-ids`, `key-value-store`, `distributed-rate-limiter`, `web-crawler`, `search-engine`, `search-autocomplete`
  - **Module 10, "Case studies: social and real time":** `notification-service`, `photo-feed`, `chat-app`, `proximity-service`, `nearby-friends`, `ride-hailing`, `maps-navigation`
  - **Module 11, "Case studies: media and files":** `video-streaming`, `file-sync`, `object-store-internals`, `email-service`
  - **Module 12, "Case studies: data pipelines":** `message-queue-design`, `metrics-alerting`, `click-aggregation`, `leaderboard`, `rag-serving`
  - **Module 13, "Case studies: money and orders":** `hotel-booking`, `orders-inventory`, `payment-system`, `digital-wallet`, `stock-exchange`
- **Stub fields:**
  - **Topics:** from the spec's tables, e.g. "Design a URL shortener".
  - **Summaries:** one plain sentence each.
  - **`buildsOn`:** the existing lesson ids for the spec's "Builds on" numbers.

- [ ] **Step 1: Write the failing test.** In `content.test.ts`, assert the subject has 59 lessons in 13 modules, and that module 9's first two ids are `design-method` and `url-shortener`.
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run content/content.test.ts`. Expected: FAIL (30 ≠ 59).
- [ ] **Step 3: Add the five modules** to `subject.ts`.
- [ ] **Step 4: Run the tests and watch them pass.** Run: `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** as `feat(content): list case-study lessons 31–59 as stubs in five modules`.

### Task 6: Lesson 32, Design a URL shortener

**Files:**
- Create: `content/system-design/url-shortener/{model.ts, model.test.ts, scene.ts, steps.ts, cheatsheet.ts, lesson.ts}`
- Create: `docs/superpowers/specs/2026-11-21-url-shortener-lesson-design.md`
- Modify: `content/index.ts`, `content/system-design/subject.ts` (title on the stub), `content/content.test.ts` (lesson 32 entry), `apps/web/e2e/lesson_smoke.py` (`url_flow`; the counts become 31 open)

**Interfaces:**
- Consumes: Task 1's `Board` and Task 3's `base62` widget.
- **Model `urlModel`:**
  - **Defaults** (all of them this lesson's own assumptions, stated in the steps): `newPerDay 30e6`, `readRatio 40`, `years 5`, `recordBytes 400`, `codeLength 7`, `dbReadCapacity 5000`, `cacheHitPct 90`, `launchReadRate 100`, `repeatPct 30`, `mode 0`, `elapsedSec 600`.
  - **Modes:** 0 is launch, 1 is full traffic, 2 adds the cache, 3 adds the code maker.
  - **Outputs:**
    - `writeRate`, `readRate`, `linksB`, `storageTb`, `codeSpaceT`, `codesUsedPct`;
    - `dbBusyPct` (mode-dependent), `dbFailPct`, `servedPct`, `cacheReadRate`, `dbReadRate`;
    - `idStart` (a fixed sample id) and `repeatReadRate`;
    - echoes of the inputs.
- **Expected values (the `model.test.ts` assertions, through `formatOutput`):**

  | Output | Defaults | Other inputs |
  |---|---|---|
  | `writeRate` | `"347"` | |
  | `readRate` | `"13,889"` | |
  | `linksB` | `"55"` | |
  | `storageTb` | `"22"` | |
  | `codeSpaceT` | `"3.5"` | |
  | `codesUsedPct` | `"1.6%"` | `codeLength: 6` gives `"96%"` |
  | `dbBusyPct` | `"2%"` in mode 0, `"278%"` in mode 1 | `"28%"` in mode 2 |
  | `dbFailPct` | `"64%"` in mode 1 | |
  | `servedPct` | `"100%"` in mode 2 | |

- **Scene:**
  - **Nodes:** users, app, cache (hidden), db, ids (hidden), and an `api` panel (`curve`, hidden).
  - **Wires:** `u_a`, `a_c`, `a_d`, `a_i`.
  - **Flows:**
    - `read`: u_a→app, a_d→db; fails at db by `dbFailPct`.
    - `readHit`: u_a→app, a_c→cache.
    - `readMiss`: u_a→app, a_c→cache, a_c back to app, a_d→db.
    - `write` (amber): u_a→app, a_i→ids, a_i back to app, a_d→db.
  - **Visual share:** writes are drawn 1 in 6, while the model has 1 in 41. The legend says "writes (shown 1 in 6)".
- **Steps (7):**
  1. The ask
  2. API and data (adds `api`)
  3. A first design (mode 0, removes `api`)
  4. It breaks (mode 1)
  5. Put a cache in front (mode 2, adds `cache`; Try it: `cacheHitPct`)
  6. Make short codes (mode 3, adds `ids`; Try it: `codeLength`)
  7. Wrap-up: 301 vs 302, bottlenecks, built from lessons 4, 10 and 15
- **Hook title:** "Turn a long link into seven characters".

- [ ] **Step 1: Write `model.test.ts`** with the assertions above, then watch it fail (module missing). Run: `npx vitest run content/system-design/url-shortener`.
- [ ] **Step 2: Implement `model.ts`** and watch the tests pass.
- [ ] **Step 3: Write the content-test entry** (`lists lesson 32, Turn a long link into seven characters`, index 31, order 32) and watch it fail.
- [ ] **Step 4: Write `scene.ts`, `steps.ts`, `cheatsheet.ts` and `lesson.ts`,** and register them. Run: `pnpm check`. Expected: PASS, with `checkContent` clean.
- [ ] **Step 5: Add the `url_flow` smoke check:**
  - h1 "Turn a long link into seven characters";
  - step 4 tile shows "278%";
  - step 5 with `cacheHitPct` set to 50: the readout contains "139%" (13,889 × 0.5 ÷ 5,000);
  - step 6 with `codeLength` set to 6: the readout contains "96%".
- [ ] **Step 6: Write the design note and commit** as `feat: URL shortener case study (Turn a long link into seven characters)`.

### Task 7: Verify and open the PR

- [ ] `pnpm check` → all pass.
- [ ] `pnpm build` → passes. Then start the server and run:
  - `python3 apps/web/e2e/lesson_smoke.py http://localhost:3300` → all ok;
  - `python3 apps/web/e2e/stage_audit.py http://localhost:3300` → `0 problems`.
- [ ] Screenshots: the pilot's steps 1, 4, 5 and 6 in warm and blueprint at 1440 px, and blueprint at 390 px. Look at them and fix what's off.
- [ ] Self-review the branch against the spec (no subagents: the user hasn't asked for them), then push and open the PR with base main. The body says: "builds on #32 (and #33's design doc)".

---

## Per-lesson recipe (lessons 31, 33–59)

For each lesson, in the spec's order, on a new branch stacked on the previous one:

1. **Sources:** read the book chapter named in the spec table (or the public sources), and pick the model's numbers. Record assumptions in the model's doc comment.
2. **Model:** write `model.test.ts` first, with the key outputs through `formatOutput`; watch it fail; then implement `model.ts`.
3. **Scene:** write the board in `scene.ts`.
   - Keep it to 4–7 nodes, in one layout across all steps.
   - Hide later boxes until the step that adds them.
   - Exaggerated packet shares go in the legend.
4. **Widgets:** if a deep dive needs a new picture (trie, geohash grid, order book…), add it to `CUSTOM` in `packages/stage/src/board/` with its own widget test first.
5. **Steps:** about seven, following the spec's lesson shape. Write the cheatsheet and the lesson, with the hook title from the spec table (40 characters at most).
6. **Register:**
   - `content/index.ts`;
   - the stub's `title` in `subject.ts`;
   - a `content.test.ts` entry;
   - a smoke flow;
   - bump the smoke counts.
7. **Check:**
   - run `pnpm check`;
   - build, then run the smoke test and `stage_audit.py` (0 problems);
   - take screenshots and look at them;
   - write the design note, commit and open the PR.
