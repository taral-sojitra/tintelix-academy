# Phase 1 First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pnpm monorepo where the Caching lesson plays end to end in a Next.js 16 site, with Home, the System Design subject page, Components, a cheatsheet, progress on the device and two themes.

**Architecture:** Framework-free TypeScript packages (`schema`, `stage`, `store`, `theme`) consumed as source by `apps/web` through `transpilePackages`. The engine is ported from `mock/proto/caching-lesson.html` (reference copy committed at `docs/reference/caching-prototype.html`); generic parts (geometry, camera, effects, packets, queue, loop) are separate from the Caching router. Lessons are TypeScript data validated by Zod.

**Tech Stack:** Node 22, pnpm 10 workspaces, Next.js 16 (App Router), React 19, TypeScript 5 strict, Zod 4, Vitest 3 (+ jsdom, fake-indexeddb), idb 8, ESLint 9 flat config, @fontsource (Inter, Bricolage Grotesque, IBM Plex Mono).

**Spec:** `docs/superpowers/specs/2026-11-20-phase1-first-slice-design.md`

## Global Constraints

- Every number on screen comes from the lesson's model; step text quotes outputs as `{name}`.
- Hook titles are 40 characters or fewer. Caching's hook title is "Survive the flash sale".
- Caching model: `traffic 6000`, `dbCapacity 6500`; `dbReads = traffic × (1 − hitRate)`; `dbBusy = dbReads / dbCapacity`; `p95 = 24 + 12 / (1 − min(dbBusy, 0.95))`, except `p95 = 25.5` when `1 − hitRate < 0.05`.
- Warm is the default theme; Blueprint is the second. Both come from `packages/theme`.
- No HTML in content. Step text allows `**bold**` and `{output}` only.
- Lesson URLs: `/<subject>/<slug>`, e.g. `/system-design/caching`; cheatsheet at `/system-design/caching/cheatsheet`.
- Fonts self-hosted; no request to fonts.googleapis.com.
- `vercel.json` sets `"regions": ["bom1"]`.
- Keyboard: ← → change step, Space pauses, R replays; focus always visible; `prefers-reduced-motion` drops particles and trails.

## Review Focus

1. IndexedDB missing or throwing (Safari private mode, blocked storage): the lesson must still play; saves fail silently and reads return defaults. Test in Task 7.
2. Arrow keys while the hit-rate slider has focus must move the slider, not change the step. Test in Task 6.
3. A phone-width stage (390 × 300 px): every node must stay inside the stage, never cropped. Test in Task 4.
4. `prefers-reduced-motion: reduce`: no particle bursts, trails capped at 3 points. Test in Task 5.
5. An unknown lesson slug such as `/system-design/nope` must 404, not render an empty player. Test in Task 9.

---

### Task 1: Workspace, tooling and theme tokens

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `.npmrc`
- Create: `packages/theme/package.json`, `packages/theme/src/tokens.ts`, `packages/theme/src/theme.css`, `packages/theme/src/index.ts`
- Create: `docs/reference/caching-prototype.html` (copy of `mock/proto/caching-lesson.html`)
- Test: `packages/theme/src/tokens.test.ts`

**Interfaces:**
- Produces: `type ThemeName = "warm" | "blueprint"`; `const THEMES: Record<ThemeName, Record<string, string>>` (CSS variable name → value); `const DEFAULT_THEME: ThemeName = "warm"`; `theme.css` sets `:root` (warm) and `[data-theme="blueprint"]`.
- Root scripts: `test` (vitest run), `typecheck` (tsc -b or per-package `tsc --noEmit`), `lint`, `build` (web), `dev` (web), `check` (typecheck + lint + test).

- [ ] **Step 1: Write the failing test** `tokens.test.ts`: `both themes define the same variables` — `expect(Object.keys(THEMES.blueprint).sort()).toEqual(Object.keys(THEMES.warm).sort())`; `default is warm` — `expect(DEFAULT_THEME).toBe("warm")`; `theme.css matches tokens` — every key of `THEMES.warm` appears in `theme.css` text.
- [ ] **Step 2: Run** `pnpm test` — expect FAIL (module not found).
- [ ] **Step 3: Implement tokens.** Warm values from the mock (`mock/v2/base2.css`, `html.warm`: page `#f6efe3`, accent `#e0602f`, headings Bricolage Grotesque); Blueprint values from the prototype `:root` (bg `#f3f5f9`, primary `#2563ff`, stage `#0a1a33`). Shared stage colours (`--cyan #38d4f0`, `--green #2fcf8f`, `--amber #f6b93b`, `--violet #9b87f5`, `--red #f26d6d`).
- [ ] **Step 4: Run** `pnpm test` and `pnpm typecheck` — PASS.
- [ ] **Step 5: Commit** `chore: workspace tooling and theme tokens`.

### Task 2: Content schema and content checks

**Files:**
- Create: `packages/schema/package.json`, `packages/schema/src/{subject,lesson,component,model,check,index}.ts`
- Test: `packages/schema/src/check.test.ts`

**Interfaces:**
- Produces (Zod schemas with inferred types, names as in LLD §3): `Subject`, `Lesson`, `Step`, `Control`, `Component`, `SceneSpec`.
- `interface Model { defaults: Inputs; run(inputs: Inputs): Outputs }`, `type Inputs = Record<string, number>`, `type Outputs = Record<string, number>`.
- `Step = { id; tag: "problem"|"technique"|"solution"|"recap"; title; short; text: string[]; note?: { kind: "watch"|"idea"|"turn"|"tip"|"next"; text }; changed?: { kind: "add"|"mod"|"del"; label; value? }[]; scene?: { add?: string[]; remove?: string[]; focus?: string[] }; sim?: { mode: "none"|"warm"|"steady"|"storm"|"jitter"; speed: number }; model?: Partial<Inputs>; controls?: string[]; live: string }`.
- `Lesson` adds to LLD fields: `model: Model` (not serialised), `scene: SceneSpec`, `cheatsheet: { heading; text: string[] }[]`.
- `SceneSpec = { world: { w; h }; bounds: { x; y; w; h }; nodes: Record<string, { x; y; w; h; kind: "users"|"lb"|"app"|"cache"|"db"; label; sub; hidden?: boolean }>; wires: Record<string, { from: [number, number]; to: [number, number] }> }`.
- `quotedOutputs(text: string): string[]` — names inside `{…}`.
- `checkContent(input: { subjects: Subject[]; lessons: Lesson[]; components: Component[] }): string[]` — returns problem messages; empty means valid.

- [ ] **Step 1: Write failing tests** in `check.test.ts`:
  - `quotedOutputs("Reads fall to {dbReads} at {p95} ms")` → `["dbReads", "p95"]`.
  - `flags a quoted value the model does not produce`: a lesson whose step text quotes `{nope}` → problems contain `caching/step drowning quotes {nope}, which the model does not produce`.
  - `flags a hook title over 40 characters` → message contains `over 40 characters`.
  - `flags a missing component` → message contains `unknown component`.
  - `flags a subject listing an unknown lesson only when the lesson is marked available` (subjects list all 20 ids; lessons not yet written are allowed; see Task 3 `available`).
  - `accepts valid content` → `[]`.
- [ ] **Step 2: Run** `pnpm test packages/schema` — FAIL.
- [ ] **Step 3: Implement** schemas and `checkContent`. For each step, run `model.run({ ...model.defaults, ...step.model })` and check every quoted name exists in the outputs. Also check the step ids are unique within a lesson and every `controls` entry names a lesson control.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(schema): lesson schema and content checks`.

### Task 3: Content: System Design subject, Caching lesson, components

**Files:**
- Create: `content/package.json` (name `@tintelix/content`), `content/index.ts`
- Create: `content/system-design/subject.ts`, `content/system-design/caching/{model,scene,steps,lesson,cheatsheet}.ts`
- Create: `content/components/{users,load-balancer,app-server,cache,database}.json`, `content/components/index.ts`
- Test: `content/system-design/caching/model.test.ts`, `content/content.test.ts`

**Interfaces:**
- Consumes: Task 2 types and `checkContent`.
- Produces: `subjects: Subject[]`, `lessons: Lesson[]`, `components: Component[]`, `getLesson(subject: string, slug: string): Lesson | undefined`, `lessonSummaries(subjectId)` returning `{ id, slug, topic, title?, module, order, available: boolean }[]`.
- Subject `system-design` has the 20 lessons in 6 modules from HLD §5: Scaling out (Vertical vs horizontal scaling, Load balancing, Forward and reverse proxy, Heartbeats and health checks), Speed (Caching, CDN), Data storage (SQL vs NoSQL, Indexing, Replication, Database sharding, Consistent hashing, Bloom filters), Consistency (CAP theorem, Consistency models, Distributed transactions), Messaging and reliability (Message queues, Idempotency, Rate limiting), Services (API gateway, Monolith vs microservices). Only `caching` has `available: true`.
- Caching steps: the prototype's six (`drowning`, `add-cache`, `slow-mo`, `expiry-storm`, `jitter`, `recap`) with its copy rewritten as plain text with `{dbReads}`, `{dbBusyPct}`, `{p95}`, `{hitRatePct}` placeholders.
- Model outputs (rounded for display by the player, not by the model): `dbReads`, `dbBusy`, `dbBusyPct`, `p95`, `hitRatePct`.

- [ ] **Step 1: Write failing tests:**
  - `model.test.ts`: defaults (`hitRate 0.92`) → `dbReads 480`, `round(dbBusyPct) 7`, `round(p95) 37`; `hitRate 0` → `round(dbBusyPct) 92`, `round(p95) 180` (± 1); `hitRate 0.82` → `dbReads 1080`, `round(p95) 38`; `hitRate 0.96` → `p95 25.5`.
  - `content.test.ts`: `checkContent({ subjects, lessons, components })` → `[]`; the subject lists exactly 20 lesson ids in 6 modules; `getLesson("system-design", "caching")?.title === "Survive the flash sale"`; `getLesson("system-design", "nope") === undefined`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** content. Scene geometry from the prototype's `NODES` and wire endpoints (`E`), world `920 × 540`, bounds `{ x: 8, y: 62, w: 896, h: 422 }`. Cheatsheet: 4 sections (When to cache, Cache-aside in four steps, The numbers, Expiry storms) quoting the model's outputs at `hitRate 0.82`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(content): System Design subject, Caching lesson, components`.

### Task 4: Stage geometry and camera

**Files:**
- Create: `packages/stage/package.json`, `packages/stage/src/geometry.ts`, `packages/stage/src/camera.ts`
- Test: `packages/stage/src/geometry.test.ts`, `packages/stage/src/camera.test.ts`

**Interfaces:**
- Produces: `type Wire = { pts: [number, number][]; cum: number[]; len: number }`; `makeWire(from: [number, number], to: [number, number], samples = 48): Wire` (cubic Bézier with control points at half the x distance, as the prototype); `posAt(w: Wire, s: number, offset = 0): [number, number]`.
- `type View = { s: number; ox: number; oy: number }`; `fitView(stage: { w: number; h: number }, bounds: { x; y; w; h }, insets: { top: number; side: number; bottom: number }): View`.

- [ ] **Step 1: Write failing tests:** `makeWire([0,0],[100,0]).len ≈ 100`; `posAt(w, 0)` equals the start and `posAt(w, w.len)` the end; `posAt` clamps `s < 0` and `s > len`; `fitView({w:1200,h:600}, bounds, {top:50,side:14,bottom:56})` keeps `bounds` inside the stage minus insets; **Review Focus 3:** with stage `390 × 300` every corner of bounds maps inside `[0, 390] × [0, 300]`.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement (port `bez`, sampling, `posAt`, `fitWith`). **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(stage): wires and camera`.

### Task 5: Simulation core and the cache-aside router

**Files:**
- Create: `packages/stage/src/sim.ts`, `packages/stage/src/effects.ts`, `packages/stage/src/routers/cache-aside.ts`, `packages/stage/src/rng.ts`
- Test: `packages/stage/src/sim.test.ts`, `packages/stage/src/routers/cache-aside.test.ts`, `packages/stage/src/effects.test.ts`

**Interfaces:**
- Produces: `rng(seed: number): () => number` (mulberry32); `class Sim { constructor(opts: { wires: Record<string, Wire>; router: Router; rand: () => number; ratePerSec: number; speed: number }); step(dt: number): void; packets: Packet[]; queues: Record<string, Queue>; events: SimEvent[] }`.
- `type Packet = { id: number; route: Leg[]; leg: number; s: number; x: number; y: number; color: string; kind: "req"|"hit"|"miss"|"db"|"fill"; hidden: boolean; dead: boolean; wait: number; trail: [number, number][] }`; `type Leg = { wire: string; dir: 1 | -1; color: string; end?: string }`.
- `interface Router { spawn(p: Packet): void; arrive(p: Packet, leg: Leg, sim: Sim): void }`; `type SimEvent = { kind: "hit"|"miss"|"fill"|"served"|"arrive"; node: string; at: [number, number] }`.
- `class Queue { push(p: Packet): void; tick(dt: number): Packet | null; get waiting(): number }` — one server, fixed service time `1 / mu`.
- `cacheAside(state: { hitRate: () => number; cacheReady: () => boolean }): Router` — routes users → lb → app-n (round robin) → cache (hit back to users; miss back to app then db) or db when no cache; db reply goes back via the app, and a `fill` packet goes app → cache.
- `effects.ts`: `class Effects { constructor(opts: { reducedMotion: boolean; rand: () => number }); ripple(...); burst(x, y, n, colors): void; float(...); step(dt): void; particles; ripples; floats; trailLimit: number }`.

- [ ] **Step 1: Write failing tests:**
  - `sim.test.ts`: with `rng(1)` and rate 6.5/s, after 60 simulated seconds the spawn count is within 15% of 390; a `Queue` with `mu = 2` serves 3 queued packets in arrival order over 1.5 s.
  - `cache-aside.test.ts`: with `hitRate 0.82`, `cacheReady true`, seeded, the share of `hit` events among cache arrivals over 2,000 arrivals is `0.82 ± 0.03`; with `cacheReady false` no packet's route includes a cache wire; every `miss` eventually produces one `fill`.
  - `effects.test.ts` (**Review Focus 4**): with `reducedMotion: true`, `burst(…, 30, …)` adds no particles and `trailLimit === 3`; with `false`, it adds 30 and `trailLimit === 13`.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement by porting the prototype's `spawn`, `arrive`, `advance` and DB queue, with all randomness from the injected `rand`. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(stage): simulation core and cache-aside router`.

### Task 6: Player and renderer

**Files:**
- Create: `packages/stage/src/player.ts`, `packages/stage/src/render/{nodes,canvas,chart}.ts`, `packages/stage/src/loop.ts`, `packages/stage/src/stage.css`, `packages/stage/src/index.ts`
- Test: `packages/stage/src/player.test.ts` (jsdom)

**Interfaces:**
- Consumes: Tasks 2, 4, 5.
- Produces: `createPlayer(lesson: Lesson, host: HTMLElement, opts?: { reducedMotion?: boolean; render?: boolean; rand?: () => number; startStep?: number }): Player`.
- `interface Player { readonly state: { stepIndex: number; inputs: Inputs; overrides: Partial<Inputs>; playing: boolean; speed: 0.5 | 1 | 2 }; outputs(): Outputs; go(i: number): void; next(): void; back(): void; setPlaying(v: boolean): void; setSpeed(v: 0.5 | 1 | 2): void; setInput(name: string, value: number): void; handleKey(e: KeyboardEvent): boolean; on(ev: "step" | "change" | "complete", fn: () => void): () => void; destroy(): void }`.
- `render: false` skips DOM and canvas work so state can be tested in jsdom.
- `loop.ts`: one `requestAnimationFrame` loop that stops when `document.hidden` or the host leaves the viewport (`IntersectionObserver`), and restarts when both are false.

- [ ] **Step 1: Write failing tests:**
  - `go` clamps: `go(-1)` → index 0, `go(99)` → last index.
  - `go` clears overrides: `setInput("hitRate", 0.5)` on `slow-mo`, then `go(3)` → `state.overrides` is `{}`.
  - `setInput` changes outputs: on `slow-mo`, `setInput("hitRate", 0)` → `outputs().dbBusyPct` rounds to 92.
  - `setInput` ignores controls not unlocked on the step (step 1 has none) — outputs unchanged.
  - `emits complete once on reaching the last step`.
  - `handleKey`: ArrowRight advances, Space toggles `playing`, R replays (index unchanged, event `step` fired); **Review Focus 2:** an ArrowLeft event whose `target` is an `<input type="range">` returns `false` and leaves the index unchanged.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Port the prototype's render functions (`renderBack`, `renderFront`, `renderChart`, node HTML, HUD tiles, key grid, TTL ring) into the render modules, reading colours from CSS variables. Step modes (`none`, `warm`, `storm`, `jitter`, `steady`) and `slow` speed follow the prototype's `currentH`. Warm start: run 90 updates at 1/30 s after the first `go(0)` so the first frame shows a busy system.
- [ ] **Step 4: Run** tests — PASS; `pnpm typecheck` — PASS.
- [ ] **Step 5: Commit** `feat(stage): player, renderer and loop`.

### Task 7: Progress on the device

**Files:**
- Create: `packages/store/package.json`, `packages/store/src/index.ts`
- Test: `packages/store/src/store.test.ts` (fake-indexeddb)

**Interfaces:**
- Produces: `type LessonProgress = { lessonId: string; furthestStep: number; lastStep: number; done: boolean; updatedAt: string }`; `openStore(factory?: IDBFactory): Store`; `interface Store { getProgress(id: string): Promise<LessonProgress | null>; allProgress(): Promise<LessonProgress[]>; saveStep(id: string, step: number, total: number): Promise<void>; getPref<T>(key: string, fallback: T): Promise<T>; setPref(key: string, value: unknown): Promise<void> }`. Database `tintelix`, version 1, stores `progress` (key `lessonId`) and `prefs`.
- `saveStep` sets `done` when `step === total - 1`, keeps `furthestStep` as a maximum.

- [ ] **Step 1: Write failing tests:** save then read; `furthestStep` never decreases; `done` after the last step; prefs round-trip with fallback; **Review Focus 1:** `openStore(undefined-factory)` where `indexedDB` is missing and a factory whose `open` throws → every method resolves (reads give `null`, `[]` or the fallback) and nothing throws.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement with `idb`, wrapping every call in try/catch. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(store): progress and prefs on the device`.

### Task 8: Web app shell, Home, subject page and Components

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `vercel.json`
- Create: `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/app/[subject]/page.tsx`, `apps/web/app/components/page.tsx`, `apps/web/app/not-found.tsx`
- Create: `apps/web/ui/{TopBar,ThemeToggle,SubjectCard,LessonRow,ComponentCard,ContinueCard}.tsx`
- Test: `apps/web/ui/ComponentCard.test.tsx` (Testing Library), screenshots

**Interfaces:**
- Consumes: `@tintelix/content` (`subjects`, `lessonSummaries`, `components`), `@tintelix/theme`, `@tintelix/store`.
- Top bar tabs: Learn (`/`), Practice and Design Lab (disabled, "Soon"), Components (`/components`), Cheatsheets (`/system-design/caching/cheatsheet` for now).
- `[subject]/page.tsx`: `generateStaticParams` returns the seven subject ids; `dynamicParams = false`. Subjects other than System Design show "Coming in Phase 2/3".
- Theme: `ThemeToggle` writes `data-theme` on `<html>` and saves pref `theme`; an inline script in `layout.tsx` applies the saved theme before paint (hash it for the CSP later).

- [ ] **Step 1: Write failing test:** `ComponentCard` renders name, one-line, "Use when" items and a rough-number list for `cache.json`.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement pages. **Step 4:** test PASS; `pnpm --filter web build` — PASS with `/`, `/system-design`, `/components` listed as static (○ or ●).
- [ ] **Step 5: Screenshot** `/`, `/system-design`, `/components` at 1440×900 and 390×844 with `scripts/shoot.py` (Playwright, `/usr/bin/google-chrome`) against `next start`; check no overflow or overlap.
- [ ] **Step 6: Commit** `feat(web): shell, home, subject page and components`.

### Task 9: Lesson page and cheatsheet

**Files:**
- Create: `apps/web/app/[subject]/[slug]/page.tsx`, `apps/web/app/[subject]/[slug]/cheatsheet/page.tsx`
- Create: `apps/web/ui/lesson/{LessonPlayer,StepNarrative,TryIt,StepTrack,LessonList}.tsx`, `apps/web/ui/lesson/lesson.css`
- Test: `apps/web/ui/lesson/StepNarrative.test.tsx`, `apps/web/e2e/lesson.spec.py` (Playwright smoke)

**Interfaces:**
- Consumes: `createPlayer` (Task 6), `openStore` (Task 7), `getLesson` (Task 3).
- `LessonPlayer` (client component) creates the player in `useEffect`, subscribes to `step`/`change`/`complete`, saves progress, restores `lastStep` on load, and destroys the player on unmount. `StepNarrative` renders step text with `{output}` replaced by the player's formatted outputs (`dbReads` → `1,080`, `dbBusyPct` → `17%`, `p95` → `38 ms`, `hitRatePct` → `82%`).
- `[slug]/page.tsx`: `generateStaticParams` returns available lessons only; `dynamicParams = false`; `notFound()` when `getLesson` is undefined.

- [ ] **Step 1: Write failing tests:**
  - `StepNarrative` with outputs `{ dbReads: 1080 }` and text `Reads fall to {dbReads} a second` renders `Reads fall to 1,080 a second`; `**bold**` renders `<strong>`.
  - Playwright smoke against `next start`: `/system-design/caching` shows "Survive the flash sale"; pressing ArrowRight twice shows step 3's title; the Try it slider is enabled on step 3 and moving it to 0 shows `92%` in the DB load tile; reloading returns to step 3 (progress restored); **Review Focus 5:** `/system-design/nope` returns status 404.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement page, narrative, controls and cheatsheet (sections from `lesson.cheatsheet`, numbers via the same formatter). **Step 4:** PASS.
- [ ] **Step 5: Screenshot** the lesson at 1440×900, 1280×720 and 390×844 in both themes, and the cheatsheet at 1440×900; compare with `mock/proto/s1.png`–`s5.png`; fix any overlap or cropping.
- [ ] **Step 6: Commit** `feat(web): Caching lesson page and cheatsheet`.

### Task 10: Whole-repo check and README

**Files:**
- Create: `README.md`
- Modify: root `package.json` (`build` runs `vitest run content packages/schema` before `next build`, so a content problem fails the build)

- [ ] **Step 1: Prove the build gate:** temporarily change one Caching step to quote `{nope}`, run `pnpm build` — expect FAIL naming the step; revert.
- [ ] **Step 2: Run** `pnpm check` (typecheck, lint, all Vitest) and `pnpm build` — all PASS, with zero lint errors.
- [ ] **Step 3: Write** `README.md`: what Tintelix is, the repo layout (from HLD §9), `pnpm install`, `pnpm dev`, `pnpm check`, how to add a lesson (files under `content/<subject>/<slug>/`, run `pnpm test`), deploying on Vercel (root directory `apps/web`, region `bom1`).
- [ ] **Step 4: Commit** `docs: README`.
