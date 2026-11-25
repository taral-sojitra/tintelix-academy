# DSA PR 1: engine and lesson 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The DSA subject live at /dsa with all 24 lessons listed and lesson 1, How to solve a problem, playable end to end.

**Architecture:** `packages/dsa` traces a lesson's TypeScript algorithm into frames (full snapshots). `packages/stage` draws frames with a framework-free structure scene. `apps/web/ui/dsa/DsaLessonView` looks the lesson up by slug, traces in the browser, and plays step slices with a code panel, presets, custom input, predictions and a LeetCode list.

**Tech Stack:** TypeScript, Zod 4, Next.js 16, React 19, Vitest + jsdom, Python 3 for the listing suite, Playwright (Python) smoke tests.

**Spec:** `docs/superpowers/specs/2026-11-25-dsa-subject-design.md` (with HLD DSA section and LLD §12).

## Global Constraints

- Lesson ids `dsa-<slug>`; hook titles ≤ 40 characters (MAX_TITLE).
- A run stops at 400 frames with `stopped: "limit"`.
- 2–6 presets per lesson, at least one with `edge`.
- Practice: Two Sum alone in lesson 1; none in lesson 23; 2–5 elsewhere; every slug in `content/dsa/leetcode.ts`.
- Pattern card required in lessons 2–22, each field under 140 characters.
- A step slice is at most 40 frames.
- Custom input limits: 16 numbers per list, values −99..99 for lesson 1.
- `packages/dsa` imports only `@tintelix/schema`; `packages/stage` never imports `@tintelix/dsa`.
- Text quotes run counts as `{<run>Steps}`.

## Review Focus

1. Custom input of an empty list or one number: the run plays to "no pair" without an error.
2. Switching language mid-step lights the same site in the other listing, on the same frame.
3. Reload mid-lesson resumes at the saved step.
4. A wrong prediction still unlocks playback and is remembered; the step doesn't lock again after reload.
5. Invalid custom input (a letter, 17 numbers, a value out of range) shows a plain message and doesn't run.

Each line has a test: 1 in Task 5 (edge presets) and Task 8 smoke; 2–4 in Task 8 smoke; 5 in Task 4 and Task 8 smoke.

---

### Task 1: DsaLesson schema

**Files:** Create `packages/schema/src/dsa.ts`, `packages/schema/src/dsa.test.ts`; modify `packages/schema/src/index.ts`, `packages/schema/src/subject.ts` (nothing if `dsa` already listed).

**Interfaces — Produces:**
- Types: `Value`, `Mark`, `Snapshot` (`{ kind: "array"; values: Value[]; marks: (Mark | null)[] }`, more kinds later), `Pointer` (`{ name; on; at: number }`), `Frame` (`{ site; note; structs: Record<string, Snapshot>; pointers: Pointer[]; vars: Record<string, Value>; steps: number }`), `Anchor`, `Field`, `InputSpec`.
- Zod: `DsaLesson`, `DsaStep`, `DsaRun` (`algo, label, listing, time, space`), `DsaPreset`, `PatternCard`, `DsaPractice` (`slug, core`), `DsaPredict` (`at, ask, options, answer, check`), with functions via `z.custom`.
- `DsaStep.part`: `method | problem | slow | pattern | spot | breaks | practice | recap`.

- [ ] Test `dsa.test.ts`: a minimal valid lesson parses; `id: "two-pointers"` (no prefix) fails; a 41-character title fails; 1 preset fails; 7 presets fail.
- [ ] Run `pnpm vitest run packages/schema/src/dsa.test.ts` → FAIL (module missing).
- [ ] Implement; export from index.
- [ ] Run → PASS. Commit `feat(schema): DSA lesson schema and frame types`.

### Task 2: Tracer

**Files:** Create `packages/dsa/package.json` (`@tintelix/dsa`, exports `.` → `src/index.ts`, dep `@tintelix/schema`), `packages/dsa/src/trace.ts`, `trace.test.ts`, `index.ts`; add to `apps/web/next.config.ts` `transpilePackages` and `content/package.json`.

**Interfaces — Produces:**
- `trace<I>(algo: (t: Tracer, input: I) => void, input: I, limit = 400): Trace` where `Trace = { frames: Frame[]; result: unknown; stopped?: "limit" }`.
- `Tracer`: `at(site, note)`, `count(n = 1)`, `set(name, value)`, `array(id, values): TArray`, `pointer(name, on: TArray, at): TPointer`, `mark(id, index, mark | null)`, `result(value)`.
- `TArray`: `length`, `get(i)`, `put(i, v)`, `mark(i, m)`, `clearMarks()`. `TPointer`: `at`, `move(by)`, `to(i)`, `hide()`.
- Frames copy all state on `at()`; after `limit` frames `trace` returns `stopped: "limit"` (the algorithm is aborted by a thrown sentinel caught inside `trace`).

- [ ] Tests: frames copy state (later mutation doesn't change an earlier frame); pointer moves show in the next frame only; `count` accumulates into `frame.steps`; `set` vars appear; an infinite loop stops at 400 frames with `stopped: "limit"`; `result` returned.
- [ ] Run → FAIL; implement; run → PASS. Commit `feat(dsa): tracer with arrays, pointers, variables and a step counter`.

### Task 3: Listing markers

**Files:** `packages/dsa/src/listing.ts`, `listing.test.ts`.

**Interfaces — Produces:** `parseListing(src: string, lang: "ts" | "py"): { code: string; lines: string[]; sites: Record<string, number[]>; changed: number[] }` (1-based lines; markers `// @site` / `# @site`, several per line, `@changed` special; trailing spaces before the marker removed); `siteLiterals(algoSource: string): string[]` (every `t.at("…"` literal).

- [ ] Tests: two sites on separate lines; one site on two lines; `@changed` with and without a site; marker stripped and line trimmed at the end; `siteLiterals` finds `t.at("check", …)` and `t.at('found', …)`.
- [ ] FAIL → implement → PASS. Commit `feat(dsa): listing markers and line maps`.

### Task 4: Input fields

**Files:** `packages/dsa/src/input.ts`, `input.test.ts`.

**Interfaces — Produces:** `parseInput(spec: InputSpec, raw: Record<string, string>): { ok: true; value: Record<string, unknown> } | { ok: false; errors: Record<string, string> }`; `formatInput(spec, value): Record<string, string>`; `checkValue(spec, value): string[]` (for presets). Kinds `ints` and `int` now; the rest arrive with their lessons.

- [ ] Tests: "3, 8, 1" and "3 8 1" parse to [3, 8, 1]; "" parses to [] when length allows 0; "3, x" → "“x” isn't a whole number"; 17 numbers → "Keep it to 16 numbers so every cell fits."; 120 → "Keep each number between −99 and 99."; `sorted: true` with [7, 3] → "… needs the numbers sorted: 7 comes before 3."; int "abc" → message; `formatInput` round-trips.
- [ ] FAIL → implement → PASS. Commit `feat(dsa): custom input fields with plain-word messages`.

### Task 5: Lesson checker and listing runner

**Files:** `packages/dsa/src/check.ts`, `run-listing.ts`, `check.test.ts`; add `typescript` as a devDependency of `@tintelix/dsa`.

**Interfaces — Produces:**
- `runTsListing(code: string, args: unknown[]): unknown` (transpile with `typescript.transpileModule`, CommonJS, run, call the single exported function).
- `checkDsaLesson(lesson: DsaLesson, algos: Record<string, Algo>, algoSources: Record<string, string>, listings: Record<string, { ts: string; py: string }>, registry: string[]): string[]`.
- `argsFor(spec: InputSpec, input): unknown[]` (field order).
- `resolveAnchor(frames, anchor): number | null`; `runCounts(lesson, preset, algos): Record<string, number>` (outputs `<run>Steps`).
- Checks (each a plain message prefixed with the lesson id): presets valid by `checkValue`; each run on each preset ends without `stopped` and returns `expect` (or passes `accept`); listing sites = emitted sites ∪ `siteLiterals`; TS listing returns expect; every step's run, preset, anchors resolve, slice ≤ 40 frames; prediction `check(next)` = `answer`; `{xSteps}` quotes exist; preset count and edge; practice rules (lesson-1 / lesson-23 / 2–5) and registry; card fields < 140; title ≤ 40.

- [ ] Tests on a fixture lesson in the test file: clean fixture → []; each of: wrong expect, unmarked site, missing anchor, slice of 41 frames, wrong prediction answer, unknown `{fooSteps}`, practice slug not in registry → one message naming it.
- [ ] FAIL → implement → PASS. Commit `feat(dsa): lesson checker and TypeScript listing runner`.

### Task 6: Structure scene for arrays

**Files:** `packages/stage/src/structure/scene.ts`, `scene.test.ts`, styles appended to `packages/stage/src/stage.css`; export `createStructureScene` from `packages/stage/src/index.ts`.

**Interfaces — Produces:** `createStructureScene(el: HTMLElement): { render(frame: Frame): void; destroy(): void }`. DOM: `.tx-struct` root; per array `.ts-array[data-id]` with `.ts-cell[data-i]` (index label `i`, value `b`), mark class `m-<mark>`; pointers `.ts-ptr[data-name]` positioned under cell `at` via CSS variable `--at` (transition on transform, none under reduced motion); variables panel `.ts-vars` with `dt/dd`; counter `.ts-steps` "Pairs checked: 10" label passed in via `render(frame, { counter: "Pairs checked" })`.

- [ ] Tests (jsdom): renders 6 cells with values; marks become classes; re-render with a moved pointer reuses the same element and sets `--at`; vars and counter text; empty array renders "empty" text.
- [ ] FAIL → implement → PASS. Commit `feat(stage): structure scene for arrays, pointers and variables`.

### Task 7: The DSA subject and lesson 1

**Files:** `content/dsa/subject.ts` (24 stubs, 8 modules, hook titles, buildsOn per HLD), `content/dsa/leetcode.ts`, `content/dsa/how-to-solve/{algo.ts,listings.ts,lesson.ts}`, `content/dsa/dsa.content.test.ts`, `content/dsa/listings.python.test.ts`; modify `content/subjects.ts`, `content/index.ts` (`dsaLessons`, `getDsaLesson`, `dsaAlgos`, `lessonFacts`, `lessonSummaries`), root `package.json` scripts.

**Interfaces — Consumes:** Tasks 1–5. **Produces:** `dsaLessons: DsaLesson[]`, `getDsaLesson(slug)`, `dsaAlgo(lessonSlug, algo)`, `dsaListings(lessonSlug)`.

Lesson 1 content: runs `slow` = `pairsTwoSum` (every pair, `t.count()` per pair, sites `check`, `found`, `none`); presets `example` [3,8,1,9,4,6]/10 → [2,3], `empty` []/5 → null, `one` [4]/4 → null, `dupes` [3,3]/6 → [0,1], `none` [1,2,3]/9 → null, `worst` 16 numbers no pair → null; steps: restate (method), clarify (method), examples (method, preset dupes), brainstorm (slow, example, prediction after the 5th check: "Which pair comes next?" → "8 + 1"), count (slow, worst, quotes `{slowSteps}`), code (method), test (method, presets empty and dupes), practice (Two Sum, core false), recap.

- [ ] Test `dsa.content.test.ts`: `checkDsaLesson` returns [] for every lesson; subject has 24 lessons in 8 modules; every stub title ≤ 40; buildsOn ids exist.
- [ ] Test `listings.python.test.ts`: every preset through python3 equals expect; skipped with a warning if python3 is missing unless `REQUIRE_PYTHON=1`.
- [ ] Scripts: `test:content` adds `packages/dsa` and `--exclude '**/*.python.test.ts'`; `check` runs tests with `REQUIRE_PYTHON=1`.
- [ ] FAIL → write content → PASS. Commit `feat(content): DSA subject and lesson 1, How to solve a problem`.

### Task 8: The page

**Files:** `apps/web/ui/dsa/{DsaLessonView.tsx,CodePanel.tsx,InputPanel.tsx,PredictCard.tsx,PracticeList.tsx,DsaNarrative.tsx,dsa.css,play.ts,play.test.ts}`; modify `apps/web/app/[subject]/[slug]/page.tsx`, `.../cheatsheet/page.tsx`; `apps/web/e2e/lesson_smoke.py`.

**Interfaces — Produces:** `stepSlice(lesson, step, trace): { start: number; end: number; predictAt: number | null }` in `play.ts`.

Behaviour: step slice plays at 700 ms a frame × speed; prediction pauses and locks Play/Next until answered (answers in prefs `dsa.predict.<id>`, answered steps don't lock again); language toggle in prefs `dsa.lang`; preset chips and custom input play the step's run in full with "Back to the example"; LeetCode ticks in prefs `dsa.leetcode`; progress via `saveStep`; keys ←/→, comma/full stop, Space; aria-live frame note; `aria-current` on the lit line. Cheatsheet shows sections, time and space per run, and the listing with `@changed` lines highlighted.

- [ ] Test `play.test.ts`: slice resolves anchors; `predictAt` index; whole run when no anchors.
- [ ] Smoke flows `dsa_subject` (subject page lists 24, 1 open) and `dsa_intro_flow` (play to the prediction, answer, counter shows 10, switch to Python keeps the lit site, custom "1, x" shows the message, "4, 6" target 10 plays to found, reload resumes the step, cheatsheet opens).
- [ ] FAIL → implement → PASS; `pnpm check`, build, full smoke suite. Commit `feat(web): DSA lesson page`.

### Task 9: Ship

- [ ] Stage audit for /dsa/how-to-solve at desktop and phone; fix overflow.
- [ ] Push `dsa-foundation`, open PR 1 against main.

## Recipe for lessons 2–24 (one PR each)

1. Branch from the previous lesson's branch (stacked like Networks) or main if merged.
2. Add the snapshot kind and tracer structure the lesson first needs (LLD table), with tracer and scene tests first.
3. Write `algo.ts` (slow and pattern runs), `listings.ts` (TS and Python with sites and `@changed`), `lesson.ts` (presets incl. an edge, steps in the five parts with one prediction, card, practice from the HLD table, cheatsheet with `ask`), and add new LeetCode slugs to the registry with evidence.
4. Add any new input field kind with its tests.
5. Register in `content/index.ts`; run the content and Python suites; add a smoke flow; run the stage audit; open the PR.
