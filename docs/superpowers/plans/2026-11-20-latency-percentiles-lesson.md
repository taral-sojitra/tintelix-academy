# Latency percentiles lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship System Design lesson 1, "The average is lying": a six-step latency-percentiles lesson with a histogram scene, a pure model, three Try-it sliders and a cheatsheet.

**Architecture:** A new `latency` scene kind plugs into the existing scene registry. Requests travel Users → Product service (→ Services pool when the page fans out), are held for a slow-motion time derived from their sampled latency, and drop into a histogram panel drawn as a node widget. Every number on stage comes from `latencyModel`.

**Tech Stack:** TypeScript, Next.js 16, pnpm workspace, Zod, Vitest 5 (jsdom for DOM tests), Python Playwright smoke test.

**Spec:** `docs/superpowers/specs/2026-11-20-latency-percentiles-design.md`

## Global Constraints

- Every number in step text, notes, readouts, tiles, markers and the cheatsheet is a model output quoted as `{name}` or formatted with `formatOutput`; nothing typed.
- Titles ≤ 40 characters; no HTML from content; every content string on stage goes through `esc`.
- Caching and CDN keep every formatted output they show today (pinned tests).
- Light pages load neither the engine nor Zod (smoke check 5 unchanged).
- Warm and Blueprint themes, reduced motion, 390 px phone layout.
- Commits end with the two attribution lines from the session.

## Review Focus

1. Sliders at their ends (slow share 0.1 and 10, calls 100, hedge after 1 and 250): markers, bars and labels stay inside the panel with finite values. Pinned by `histX` clamping and the model-extremes test (Tasks 2, 4).
2. Mean, p50 and p99 at the same value (slow share under 1%): three marker labels must not overprint. Pinned by the marker-rows test (Task 4).
3. Reduced motion: dots appear at rest instead of falling, and nothing animates forever. Pinned in Task 4.
4. Resuming at step 4 or 5 (warm start pre-runs 3 s): the services widget and histogram open in a sane state, no stuck cells. Pinned in Task 4 (enter + advance with no events leaves no running cell).
5. Lesson switching between Latency and Caching via the lesson list carries nothing across. Smoke check in Task 6.

---

### Task 1: Percentages under 10 keep one decimal

**Files:**
- Modify: `packages/schema/src/format.ts`
- Test: `packages/schema/src/format.test.ts`

**Interfaces:** Produces `formatOutput(name, value)` with the new rule; no signature change.

- [ ] **Step 1: Pin CDN as it reads today.** Add `describe("formatOutput keeps CDN as it reads today")`: for each CDN step and the cheatsheet inputs, record `formatOutput(k, v)` for every output of `cdn.model.run({...defaults, ...step.model})` into a literal object in the test (generate the literals from the current code first, then paste them), and assert equality. Run: `npx vitest run packages/schema/src/format.test.ts` → PASS (it records today).
- [ ] **Step 2: Write the failing rule test.**
```ts
it("keeps one decimal for percentages under 10 that aren't whole", () => {
  expect(formatOutput("pageSlowPct", 9.5618)).toBe("9.6%");
  expect(formatOutput("slowPct", 0.5)).toBe("0.5%");
  expect(formatOutput("pageSlowPct", 0.09996)).toBe("0.1%");
  expect(formatOutput("slowPct", 1)).toBe("1%");
  expect(formatOutput("pageSlowPct", 63.397)).toBe("63%");
  expect(formatOutput("slowPct", 9.96)).toBe("10%");
});
```
- [ ] **Step 3: Run it.** Expected: FAIL ("10%" received for 9.5618).
- [ ] **Step 4: Implement** in the `Pct` branch: round to one decimal; if that is under 10 and not whole, show it with one decimal; otherwise keep the existing rules.
- [ ] **Step 5: Run the whole format test.** Expected: PASS, including both pinned blocks.
- [ ] **Step 6: Commit** `feat(schema): percentages under 10 keep one decimal`.

### Task 2: The latency model

**Files:**
- Create: `content/system-design/latency-percentiles/model.ts`, `model.test.ts`

**Interfaces:**
- Produces `latencyModel: Model` with defaults `{ fastMs: 2, slowMs: 200, slowPct: 5, perDay: 1000000, calls: 1, hedge: 0, hedgeMs: 10 }`.
- Outputs: `fastPct, meanMs, callP50Ms, callP99Ms, pageP50Ms, pageP99Ms, pageMeanMs, pageFastPct, pageMidPct, pageSlowPct, hedgeReplyMs, hedgedPct, slowPerDay, tenCallsSlowPct, hundredCallsSlowPct` and echoes `fastMs, slowMs, slowPct, perDay, calls, hedgeMs`.
- Definitions (s = slowPct/100, f, S, H, N): `hedgeReplyMs` = hedge on and H + f < S ? H + f : S. One call takes f (1 − s), `hedgeReplyMs` (s(1 − s), hedge on only), S (s², or s when off). A page is the max of N calls: P(page ≤ v) = P(call ≤ v)^N. `pageFastPct` = 100(1 − s)^N; `pageMidPct` = 100((1 − q)^N − (1 − s)^N) with q = s² when hedging helps, else q = s; `pageSlowPct` = 100 − fast − mid. Percentiles are nearest rank with a 1e-9 tolerance. `tenCallsSlowPct`, `hundredCallsSlowPct` = 100(1 − (1 − s)^10 / ^100). Inputs are clamped: slowPct to [0, 100], calls to an integer ≥ 1.

- [ ] **Step 1: Write the failing tests** — one `it` per row of the spec's check-value table, plus:
```ts
it("splits every page into fast, hedged and slow shares that add up to 100", () => {
  for (const extra of [{}, { slowPct: 1, calls: 10 }, { slowPct: 1, calls: 10, hedge: 1 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 1 }]) {
    const o = run(extra);
    expect(o.pageFastPct + o.pageMidPct + o.pageSlowPct).toBeCloseTo(100, 9);
  }
});
it("stays finite at every slider end", () => {
  for (const extra of [{ slowPct: 0.1 }, { slowPct: 10 }, { slowPct: 1, calls: 100 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 1 }, { slowPct: 1, calls: 10, hedge: 1, hedgeMs: 250 }]) {
    for (const v of Object.values(run(extra))) expect(Number.isFinite(v)).toBe(true);
  }
});
it("gives the cheatsheet's fan-out figures at the defaults", () => {
  expect(run({}).tenCallsSlowPct).toBeCloseTo(40.13, 2);
  expect(run({}).hundredCallsSlowPct).toBeCloseTo(99.41, 2);
});
it("matches the page average to the shares", () => {
  const o = run({ slowPct: 1, calls: 10, hedge: 1 });
  expect(o.pageMeanMs).toBeCloseTo((o.pageFastPct * 2 + o.pageMidPct * 12 + o.pageSlowPct * 200) / 100, 9);
});
```
(`run = (x) => latencyModel.run({ ...latencyModel.defaults, ...x })`.)
- [ ] **Step 2: Run** `npx vitest run content/system-design/latency-percentiles` → FAIL (module missing).
- [ ] **Step 3: Implement** with a source comment on each teaching value (book §4.2, §4.3, §4.7; Dean and Barroso 2013).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(content): latency percentiles model`.

### Task 3: Scene kind, events and the latency router

**Files:**
- Modify: `packages/schema/src/lesson.ts` (kind `"latency"`, modes `["none", "average", "histogram", "fanout", "hedge"]`, node kinds `"services"`, `"histogram"`)
- Modify: `packages/stage/src/sim.ts` (`Packet.ms?: number`; `SimEvent` adds `{ kind: "work"; node: string; at: Point; ms: number }` and `{ kind: "done"; node: string; at: Point; ms: number }`)
- Modify: `packages/stage/src/icons.ts` (`stack`, `bars`), `packages/stage/src/render/dom.ts` (`KIND_ICON.services = "stack"`, `histogram = "bars"`), `packages/stage/src/stage.css` (tile colours `k-services` violet, `k-histogram` blue)
- Create: `packages/stage/src/routers/latency.ts`, `routers/latency.test.ts`

**Interfaces:**
- Produces `latency(state: { fanOut(): boolean; sample(): number; hold(ms: number): number; hue(ms: number): Hue }): Router`.
- Wires `users_app`, `app_services`. Route: spawn → `users_app` (end `app`). At `app`: fanning out → `app_services` (end `services`); else sample `ms`, `p.ms = ms`, `p.wait = hold(ms)`, emit `work` at `app`, return on `users_app` with `hue(ms)` (end `user`). At `services`: sample, hold, emit `work` at `services`, return on `app_services` (end `back`), then `users_app` (end `user`). At `user`: emit `done` with `p.ms`, `p.dead = true`.

- [ ] **Step 1: Write failing router tests** (mirror `routers/cdn.test.ts`):
  - "one call: every request goes to the app and back, never to the services" — `legs(users_app) = 2 × spawned`, `legs(app_services) = 0`, `count(done) = spawned`.
  - "fan-out: every page crosses app_services both ways" — `legs(app_services) = 2 × spawned`, `work` events all at `services`.
  - "done carries the sampled latency and the share of slow replies follows sample()" — with `sample = () => (rand() < 0.2 ? 200 : 2)` over 60 s at 40/s, the share of `done` with ms 200 is within 0.17–0.23.
  - "a request waits hold(ms) before it returns" — one packet, `hold = () => 1.5`; at 1.4 s after arrival no `done`, by 1.5 s + travel time one `done`.
- [ ] **Step 2: Run** `npx vitest run packages/stage/src/routers/latency.test.ts` → FAIL.
- [ ] **Step 3: Implement** the schema, sim types, icons, `KIND_ICON`, CSS tiles and the router.
- [ ] **Step 4: Run** the router tests and `pnpm check` → PASS (existing tests unchanged).
- [ ] **Step 5: Commit** `feat(stage): latency scene kind and router`.

### Task 4: The latency scene runtime

**Files:**
- Create: `packages/stage/src/scenes/latency.ts`, `scenes/latency.test.ts` (jsdom)
- Modify: `packages/stage/src/scenes/index.ts`, `packages/stage/src/stage.css`

**Interfaces:**
- Consumes `latency(...)` from Task 3 and the output names from Task 2 (read from `ctx.model.run`; the stage never imports content except in tests).
- Produces `createLatencyScene(o): LatencyScene` (registered as `scenes.latency`) and pure helpers:
  - `histX(ms: number, width: number): number` — log10 position on 1–1,000 ms, clamped to [0, width].
  - `barHeight(sharePct: number, height: number): number` — `sqrt(share / 100) × height`, 0 for 0.
  - `holdSec(ms: number, fastMs: number): number` — `min(3, 0.25 × sqrt(ms / fastMs))`.
  - `sampleMs(live: Outputs, r: number): number` — r in [0, 1): fast below `pageFastPct`, `hedgeReplyMs` below fast + mid, else `slowMs`.
  - `MARKER_ROWS: Record<"avg" | "p50" | "p99", number>` — three distinct label rows.
- Chart `{ label: "DASHBOARD AVERAGE · LAST 30 S", output: "meanMs", max: 250, danger: 100 }`. Legend: request (cyan), fast reply (green), copy won (amber), slow reply (red). `R_VIS = 5`.
- Tiles per spec §4 (ids `avg`, `p50`, `p99`, `slow`, `fifth`); `average` mode shows "—" for all but `avg`. Steps 4–6 label them "Page p50", "Page p99", "Slow pages", "Extra calls".
- Histogram node body: SVG with axis ticks 1/10/100/1,000 ms, three bars (fast/mid/slow at `fastMs`/`hedgeReplyMs`/`slowMs`, heights from `pageFastPct`/`pageMidPct`/`pageSlowPct`, share printed on each, mid hidden at 0), three markers (`pageMeanMs` amber dashed, `pageP50Ms` green, `pageP99Ms` red, labels "avg …", "p50 …", "p99 …"), and a pool of 24 dots. A `done` event drops a dot at `histX(ms)`; reduced motion places it at rest.
- Services node body: up to 20 cells and a "×N" chip when `calls` > 20. A `work` event at `services` lights the cells; a slow `ms` marks one cell red until it ends, a hedged one marks one amber with a copy flash.

- [ ] **Step 1: Write failing tests:**
  - `histX(1, 300) === 0`, `histX(1000, 300) === 300`, `histX(10, 300) === 100`, `histX(0.5, 300) === 0`, `histX(5000, 300) === 300`.
  - `barHeight(1, 100) === 10`, `barHeight(100, 100) === 100`, `barHeight(0, 100) === 0`.
  - `holdSec(2, 2) === 0.25`, `holdSec(200, 2) === 2.5`, `holdSec(20000, 2) === 3`.
  - `sampleMs` at defaults: r 0.94 → 2, r 0.96 → 200; at `{slowPct: 1, calls: 10, hedge: 1}`: r 0.5 → 2, r 0.95 → 12, r 0.9995 → 200.
  - Marker rows: `new Set(Object.values(MARKER_ROWS)).size === 3`.
  - With the lesson's own scene spec and model (test-only import as `cdn.test.ts` does): tiles in `average` mode read `12 ms` then four "—"; in `histogram` mode `p50` "2 ms", `p99` "200 ms", `slow` "5%", fifth "50,000"; in `hedge` mode (step 5 inputs) `p99` "12 ms", fifth "1%".
  - After `enterStep` on a `fanout` step and `advance(3)` with no events, no services cell is running.
  - Reduced motion: after a `done` event, the new dot is at rest (its `fall` progress is 1).
- [ ] **Step 2: Run** `npx vitest run packages/stage/src/scenes/latency.test.ts` → FAIL.
- [ ] **Step 3: Implement** the scene, register it, add the panel and cell CSS (both themes use palette variables only).
- [ ] **Step 4: Run** the scene tests and `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat(stage): latency scene with histogram panel`.

### Task 5: The lesson content

**Files:**
- Create: `content/system-design/latency-percentiles/{scene,steps,cheatsheet,lesson}.ts`
- Modify: `content/index.ts` (add `latencyPercentiles` first), `content/system-design/subject.ts` (hook title "The average is lying"), `content/content.test.ts`

**Interfaces:**
- Consumes Task 2's outputs and Task 4's modes. Scene spec: world 1000 × 470; `users` (36, 70, 166 × 74), `app` kind `app` "Product service" (400, 60, 200 × 96), `services` hidden (760, 52, 210 × 120), `histogram` hidden (36, 196, 934 × 200); wires `users_app` [202, 107]→[400, 107], `app_services` [600, 108]→[760, 112]; bounds (8, 44, 984 × 368). Builder may adjust coordinates.
- Steps exactly as the spec's table: ids `calm-dashboard`, `two-humps`, `watch-the-tail`, `fan-out`, `hedge`, `recap`; modes `average`, `histogram`, `histogram`, `fanout`, `hedge`, `hedge`; models `{}`, `{}`, `{}`, `{slowPct: 1, calls: 10}`, `{slowPct: 1, calls: 10, hedge: 1}` (steps 5 and 6); `scene.add` `histogram` at step 2 and `services` at step 4; controls `slowPct` (step 3), `calls` (step 4), `hedgeMs` (step 5).
- Controls: `slowPct` 0.1–10 step 0.1 unit "%"; `calls` 1–100 step 1; `hedgeMs` 1–250 step 1 unit "ms"; readouts as in the spec, quoting outputs only.
- Lesson: id/slug `latency-percentiles`, topic "Latency percentiles", title "The average is lying", promise from the spec, minutes 8, level 1, components `["users", "app-server"]`, buildsOn `[]`, questions `[]`, no `cheatsheetInputs`.

- [ ] **Step 1: Update `content.test.ts` first:** Latency percentiles is available at `{ module: "Measuring systems", order: 1, available: true }` with title "The average is lying"; `lessons` has 3 entries; the lesson passes `checkContent` (the existing whole-content test). Run → FAIL.
- [ ] **Step 2: Write the content files** and register the lesson.
- [ ] **Step 3: Run** `pnpm check` → PASS (content gate included).
- [ ] **Step 4: Commit** `feat(content): The average is lying (latency percentiles lesson)`.

### Task 6: Smoke checks and visual check

**Files:**
- Modify: `apps/web/e2e/lesson_smoke.py`

- [ ] **Step 1: Add smoke checks:**
  - `latency_flow`: loads `/system-design/latency-percentiles`, h1 "The average is lying", tile `avg` "12 ms" and the chart label stays "12 ms"; step 3: slider `#ctl-slowPct` set to 0.9 shows readout containing "2 ms" for p99 and to 1.1 shows "200 ms", the average "4 ms" both times; step 4: `#ctl-calls` End → readout contains "63%"; step 5: tile `p99` "12 ms".
  - `latency_cheatsheet`: the cheatsheet shows the line with "12 ms" and "40%".
  - `home_start_here`: a fresh context's Home card reads "Start here · System Design · Lesson 1 of 30" and "The average is lying".
  - `lesson_switch_latency`: from Latency step 4, the lesson list link "Survive the flash sale" opens Caching at its own step 1 with no `[data-tile='slow']`.
  - Update `subject_page` to "3 open now" and "3 of 30 open".
- [ ] **Step 2: Run** `pnpm build`, start the built site on port 3100, run `python3 apps/web/e2e/lesson_smoke.py http://localhost:3100` → all checks `ok`.
- [ ] **Step 3: Screenshots** of steps 2, 4 and 5 at 1440 and 390 px in both themes; look at each (valley visible, markers readable, nothing cropped). Fix what fails and re-run.
- [ ] **Step 4: Commit** `test(web): smoke checks for the latency lesson`.
