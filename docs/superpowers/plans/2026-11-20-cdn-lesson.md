# CDN Lesson and Scene Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second System Design lesson, "Serve Mumbai from Mumbai" (CDN), on a player that chooses its diagram by lesson.

**Architecture:**
- `lesson.scene.kind` picks a scene factory from a registry in `packages/stage/src/scenes/index.ts`.
- Each scene owns its routing, legend, request rate and queues, node widgets, chart and tiles. The player keeps the loop, steps, inputs, controls, keys, camera, canvases and saving.
- Caching moves into its scene first, with no change in behaviour. The CDN model, router, scene and content follow.

**Tech Stack:**
- TypeScript 5.9 and Zod 4.
- Vitest 5 with jsdom.
- Next.js 16 and pnpm 10 workspaces.
- Python Playwright for the smoke test.

**Spec:** `docs/superpowers/specs/2026-11-20-cdn-lesson-design.md`. Read §4 (lesson, model, formatting, diagram) and §5 (engine) before Task 1.

## Global Constraints

**Numbers come from the model**
- Every number in step text, notes, "What changed" lines, control readouts and the cheatsheet is a `{output}` quote, never typed.
- `checkContent` enforces this at build time.
- Stage labels and tiles agree with the model. Only the chart line may carry noise.

**Content rules**
- Titles are 40 characters or fewer.
- Content text is plain text with `**bold**` and `{name}` only, never HTML.
- Both themes (Warm, Blueprint), reduced motion, and phone width (390 px) behave as they do for Caching.

**Caching must not change**
- Its look, numbers and behaviour stay the same.
- Existing tests stay green, except tests that move with the code they cover.
- The 5 smoke checks keep passing.

**Bundle**
- Light pages (`/`, `/system-design`, `/components`) load neither the stage engine nor Zod.

**Model constants** (with sources, spec §6):
- `TRIPS = 4`, `EDGE_RTT_MS = 10`, `ORIGIN_SERVE_MS = 20`, `EDGE_SERVE_MS = 2`, `PURGE_SEC = 1`.
- Round trip `rttOriginMs = 2 + 0.0146 × originKm`.

**Model defaults:** `traffic 6000, pages 2000, originKm 13000, edge 0, ttlSec 3600, purge 0, filled 1, oldPrice 999, newPrice 799`.

**Every commit ends with:**

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LhwvoaiBT4Xx86Red1iev1
```

## Review Focus

1. **Moving between lessons in the lesson list.** Client navigation from Caching on step 3 to CDN must show CDN step 1, CDN tiles and no Caching overrides. *Test: Task 9 smoke `lesson_switch`.*
2. **Replaying or going back into the stale step.** `R` on step 4, or step 5 → step 4, must show the old price at the edge and the new one at the origin again, never a mix. *Test: Task 7 "re-entering the stale step resets prices and copies".*
3. **Slider extremes.**
   - TTL at 10 s shows 97% edge hits.
   - Distance at 1,000 km shows a 17 ms round trip; at 17,000 km, 250 ms.
   - Never "100%", "NaN" or "0 ms".

   *Test: Task 4 formatted-output cases.*
4. **The CDN stage on a 390 × 300 phone stage.** All three nodes and both region boxes stay inside the stage. *Test: Task 8 "fits a 390 × 300 stage".*
5. **Saved progress is per lesson.** Caching saved at step 3 must not open CDN at step 3. *Test: Task 9 smoke `lesson_switch` opens CDN fresh, then checks the step title.*

---

### Task 1: Schema: scene kinds, regions, wire pace and labels, and stricter content checks

**Files:**
- Modify: `packages/schema/src/lesson.ts`, `packages/schema/src/check.ts`, `packages/schema/src/index.ts`, `content/system-design/caching/scene.ts` (add `kind: "cache-aside"`).
- Test: `packages/schema/src/check.test.ts`.

**Interfaces:**
- Produces:
  - `SCENE_KINDS = ["cache-aside", "cdn"] as const` and `type SceneKind`.
  - `SCENE_MODES: Record<SceneKind, readonly string[]>`:
    - `"cache-aside"`: `none, warm, steady, storm, jitter`;
    - `cdn`: `none, direct, warm, steady, stale, purge`.
  - `SceneSpec` gains:
    - `kind: SceneKind`;
    - `regions?: {id, label, x, y, w, h}[]`;
    - node kinds plus `"edge" | "origin"`;
    - wire `pace?: number` (positive) and `label?: string`.
  - `Step.sim.mode` becomes `z.string()`.

- [ ] **Step 1: Write the failing tests** in `check.test.ts`. Each builds a variant of the Caching lesson and expects one problem:
  - `rejects a sim mode the scene kind doesn't have` → mode `"stale"` on Caching. Expect `caching/step <id> uses sim mode stale, which a cache-aside scene doesn't have`.
  - `rejects a node outside the scene bounds` → users `x: -50`. Expect `caching: node users lies outside the scene bounds`.
  - `rejects a step that names an unknown node` → `scene.add: ["nope"]`. Expect `caching/step <id> names unknown node nope`.
  - `rejects a step that sets something that is not a model input` → `model: { hitRat: 0.5 }`. Expect `caching/step <id> sets hitRat, which is not a model input`.
  - `rejects a lesson that differs from its subject entry` → title `"Something else"`. Expect `caching: title "Something else" differs from its subject entry "Survive the flash sale"`. The same message shape covers `slug` and `topic`; `title` is compared only when the stub has one.
  - The existing test "passes for the real content" stays green.
- [ ] **Step 2: Run** `npx vitest run packages/schema` and `pnpm typecheck`. Expected: the 5 new tests FAIL with missing problems; typecheck fails until Caching's scene has `kind`.
- [ ] **Step 3: Implement** the schema fields and the five checks in `checkContent`, and export `SCENE_KINDS`, `SCENE_MODES` and `type SceneKind`. Add `kind: "cache-aside"` to `cachingScene`.
- [ ] **Step 4: Run** `pnpm check`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(schema): scene kinds and stricter content checks`.

### Task 2: Number formatting for durations, near-100% rates, small numbers and prices

**Files:**
- Modify: `packages/schema/src/format.ts`.
- Test: `packages/schema/src/format.test.ts`.

**Interfaces:**
- Produces `formatOutput(name, value)` with these added rules. Nothing else changes.

- [ ] **Step 1: Pin Caching first.** Write `keeps every Caching output exactly as it reads today`. For each Caching step and for `cheatsheetInputs`, record `formatOutput(name, value)` for every model output as a literal expected map. Run it; it PASSES now, and it must stay green.
- [ ] **Step 2: Write the failing tests:**

  | Input | Expected |
  |---|---|
  | `formatOutput("staleSec", 1)` | `"1 s"` |
  | `("staleSec", 60)` | `"60 s"` |
  | `("staleSec", 3600)` | `"60 min"` |
  | `("ttlSec", 7200)` | `"2 h"` |
  | `("edgeHitPct", 99.99)` | `"99.9%"` |
  | `("edgeHitPct", 99.45)` | `"99.4%"` |
  | `("edgeHitPct", 96.77)` | `"97%"` |
  | `("edgeHitPct", 100)` | `"100%"` |
  | `("originReqs", 0.56)` | `"0.6"` |
  | `("originReqs", 9.96)` | `"10"` |
  | `("originReqs", 0)` | `"0"` |
  | `("oldPrice", 999)` | `"₹999"` |
  | `("newPrice", 1299)` | `"₹1,299"` |

- [ ] **Step 3: Run** `npx vitest run packages/schema/src/format.test.ts`. Expected: the new cases FAIL; the pin PASSES.
- [ ] **Step 4: Implement** the rules from the spec's §4 "Number formatting" table:
  - `Sec` durations;
  - one decimal, floored, strictly between 99 and 100 for `Pct`;
  - `Price` as rupees;
  - plain numbers rounded to tenths, shown with one decimal only when under 10 and not whole.
- [ ] **Step 5: Run** `pnpm test`. Expected: all PASS, the Caching pin included.
- [ ] **Step 6: Commit** `feat(schema): format durations, near-full rates, small numbers and prices`.

### Task 3: Scene registry — Caching moves into its scene, with no behaviour change

**Files:**
- Create: `packages/stage/src/scenes/index.ts`, `packages/stage/src/render/dom.test.ts`.
- Modify:
  - `packages/stage/src/scenes/types.ts`;
  - `packages/stage/src/scenes/cache-aside.ts`;
  - `packages/stage/src/render/dom.ts`;
  - `packages/stage/src/render/canvas.ts` (`drawChart` scale);
  - `packages/stage/src/player.ts`;
  - `packages/stage/src/player.test.ts`.

**Interfaces:**
- Consumes `SceneKind` and `SceneSpec` from Task 1.
- Produces:
  - **`StepContext`** gains `playing: boolean` and `reducedMotion: boolean`.
  - **`SceneRuntime`** gains:
    - `readonly legend: [PaletteKey, string][]`;
    - `readonly sim: { ratePerSec: number; queues?: Record<string, number> }`;
    - `readonly chart: { label: string; output: string; max: number; danger: number }`;
    - `readonly lane: [number, number] | null`;
    - `nodeBody(id: string, node: SceneNode): string`;
    - `mount(world: HTMLElement): void`;
    - `paintWidgets(display: Outputs, ctx: StepContext, rdt: number): void`;
    - `chartSample(live: Outputs, sim: Sim): number`.
  - `type SceneFactory = (o: { fx: Effects; rand: () => number; scene: SceneSpec }) => SceneRuntime`.
  - `scenes: Record<SceneKind, SceneFactory>`.
  - **`buildStage(host, spec, opts: { legend; chartLabel: string; nodeBody: (id, node) => string })`** returns `StageDom { root, world, back, front, chart, chartValue, tagText, nodes }`.
  - `export function nodeHead(node, opts?: { small?: boolean; badge?: string }): string` in `dom.ts`, for scenes to build node headers with. Its output is escaped.
  - `drawChart(s, hist, pal, scale: { max: number; danger: number })`.

- [ ] **Step 1: Take "before" screenshots of Caching.** Build and start the server, then run `scripts/shoot.py` at 1440x900 and 390x844 in warm and blueprint, on steps 1, 2 and 4, into `screenshots/t3-before/`.
- [ ] **Step 2: Write the failing tests.**
  - In `dom.test.ts` (jsdom): `builds each node with the body its scene supplies, plus the legend and chart label`.
    - Use a 2-node spec, `nodeBody: (id) => '<i data-x="' + id + '"></i>'`, legend `[["cyan","request"]]` and chartLabel `"PAGE LOAD · LAST 30 S"`.
    - Expect `[data-node=users] [data-x=users]`, the legend text and the chart label text.
  - In `player.test.ts`: `refuses a lesson whose scene kind has no runtime`. `createPlayer({...caching, scene: {...caching.scene, kind: "nope"}}, div, {render:false})` throws `/no scene runtime for "nope"/`.
  - In `player.test.ts`: `finds a runtime for every scene kind`. Every `SCENE_KINDS` entry has `scenes[kind]`; `cdn` may be a placeholder until Task 7.
- [ ] **Step 3: Run** `npx vitest run packages/stage`. Expected: the 3 new tests FAIL.
- [ ] **Step 4: Implement.**
  - Move out of `player.ts` and `dom.ts` into `scenes/cache-aside.ts`, unchanged in behaviour:
    - `LEGEND`, `R_VIS`, `MU_VIS`, the app-server wobble meters and the cache and DB meters;
    - keys, the TTL ring, the `hot` class and `--heat`;
    - the `"cache"` NEW badge, the queue label and the "DB LOAD · LAST 30 S" label;
    - the chart sample noise (± 1.5, + 2 when more than 4 wait) and `nodeHtml`'s cache, db and app markup.
  - The player calls `scenes[lesson.scene.kind]` and throws `Error('no scene runtime for "<kind>"')` when it's missing.
  - `drawChart` takes `{max: 100, danger: 85}` for Caching.
  - Register `cdn: createCacheAsideScene` as a **placeholder**, replaced in Task 7. Ledger it.
- [ ] **Step 5: Run** `pnpm check` and the smoke test against a fresh build. Expected: all PASS and 5/5. Then take "after" screenshots into `screenshots/t3-after/` and compare them side by side with "before". Expected: the same layout, labels, meters, legend and chart. Moving packets differ only because the timing is random.
- [ ] **Step 6: Commit** `refactor(stage): scene registry; Caching widgets move into its scene`.

### Task 4: CDN model

**Files:**
- Create: `content/system-design/cdn/model.ts`.
- Test: `content/system-design/cdn/model.test.ts`.

**Interfaces:**
- Produces `cdnModel: Model` with the defaults in Global Constraints.
- Outputs:
  - `rttOriginMs, rttEdgeMs, noEdgePageMs, hitPageMs, missPageMs, perPageRate, edgeHitPct, originReqs, pageMs, p95, staleSec`;
  - echoes `traffic, pages, originKm, ttlSec, oldPrice, newPrice`.

- [ ] **Step 1: Write the failing tests** (`toBeCloseTo` to one decimal):

  | Case | Expected |
  |---|---|
  | Defaults | `rttOriginMs` 191.8, `noEdgePageMs` 787.2, `hitPageMs` 42, `missPageMs` 251.8, `pageMs` 787.2, `p95` 787.2, `edgeHitPct` 0, `originReqs` 6000, `staleSec` 3600 |
  | `{edge:1}` | `edgeHitPct` 99.99 (> 99.98), `originReqs` 0.56, `pageMs` 42, `p95` 42 |
  | `{edge:1, ttlSec:60}` | `edgeHitPct` 99.45, `originReqs` 33.1 |
  | `{edge:1, ttlSec:1}` | `edgeHitPct` 75, `p95` 251.8, `pageMs` 42 |
  | `{edge:1, filled:0.3}` | `pageMs` 251.8 (hit below 0.5) |
  | `{purge:1}` | `staleSec` 1 |
  | `{originKm:1000}` | `rttOriginMs` 16.6 |
  | `{originKm:17000}` | `rttOriginMs` 250.2 |

  Then the formatted strings for Review Focus 3, through `formatOutput`:
  - `{edge:1, ttlSec:10}` → `edgeHitPct` "97%";
  - 1,000 km → `rttOriginMs` "17 ms";
  - 17,000 km → "250 ms".
- [ ] **Step 2: Run** `npx vitest run content/system-design/cdn`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `cdnModel` with the spec's §4 formulas. Each constant gets a one-line source comment from spec §6.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): CDN model`.

### Task 5: Engine support for long-distance diagrams: wire pace, regions, wire labels and new icons

**Files:**
- Modify:
  - `packages/stage/src/geometry.ts` (`makeWire(from, to, pace = 1)`, `Wire.pace`);
  - `packages/stage/src/sim.ts` (packets move `speed × wire.pace × dt`);
  - `packages/stage/src/player.ts` (pass `pace`);
  - `packages/stage/src/render/dom.ts` (regions and wire labels);
  - `packages/stage/src/icons.ts` (`edge`, `origin`);
  - `packages/stage/src/stage.css`.
- Test: `packages/stage/src/sim.test.ts`, `packages/stage/src/render/dom.test.ts`.

**Interfaces:**
- Consumes `SceneSpec.regions` and wire `pace`/`label` from Task 1.
- Produces:
  - `Wire.pace: number`.
  - In the world layer, behind the nodes: `.tx-region` elements (`data-region=id`, label text), and `.tx-wlabel` elements (`data-wire=id`) at each labelled wire's midpoint.
  - Icon names `"edge"` and `"origin"`.

- [ ] **Step 1: Write the failing tests:**
  - `sim.test`: `a packet on a wire with pace 0.25 takes four times as long`. Run two Sims, one on a pace-1 wire and one on a pace-0.25 wire of the same length, until the packet arrives. Expect the time ratio within 4 ± 0.1.
  - `dom.test`: `draws region boxes and wire labels behind the nodes`. Expect `[data-region=mumbai]` with text "Mumbai", and `[data-wire=u_origin].tx-wlabel` with the label text. Both come before the first `.tx-node` in document order.
- [ ] **Step 2: Run** `npx vitest run packages/stage`. Expected: the 2 new tests FAIL.
- [ ] **Step 3: Implement.**
  - Regions are rounded, dashed boxes with an uppercase mono label. Wire labels are small mono chips. Both use theme variables only, so they work in Warm and Blueprint.
  - Icons follow the existing 24 × 24 stroke style.
  - `KIND_ICON` maps `edge → "edge"` and `origin → "origin"`.
- [ ] **Step 4: Run** `pnpm check`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(stage): wire pace, regions, wire labels, edge and origin icons`.

### Task 6: CDN router

**Files:**
- Create: `packages/stage/src/routers/cdn.ts`.
- Test: `packages/stage/src/routers/cdn.test.ts`.

**Interfaces:**
- Produces `cdn(state: { hasEdge: () => boolean; hitRate: () => number }): Router`.
  - Wires: `u_origin`, `u_edge`, `edge_origin`.
  - Leg ends: `"origin"`, `"edge"`, `"originFromEdge"`, `"edgeBack"`, `"user"`.
  - Events:
    - `pass` at origin;
    - `hit` and `miss` at edge;
    - `fill` at edge on every miss's return;
    - `reply` at users with `hit` set.
  - Colours: cyan going out; green for a hit back; amber for an origin answer back.

- [ ] **Step 1: Write the failing tests** with a seeded `rng` and 2,000 spawned packets on the real CDN wires (an inline wire map is fine):
  - `with no edge, every request crosses u_origin both ways`;
  - `with an edge, hit share follows hitRate (0.9 ± 0.03)`;
  - `every miss crosses edge_origin both ways and stores exactly one copy`, meaning the fill count equals the miss count;
  - `hits never touch edge_origin`.
- [ ] **Step 2: Run** `npx vitest run packages/stage/src/routers`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the router, mirroring `cache-aside.ts`.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat(stage): CDN router`.

### Task 7: CDN scene and diagram

**Files:**
- Create:
  - `packages/stage/src/scenes/cdn.ts`;
  - `content/system-design/cdn/scene.ts` (geometry, `kind: "cdn"`).
- Modify: `packages/stage/src/scenes/index.ts` (replace the placeholder), `packages/stage/src/stage.css`.
- Test: `packages/stage/src/scenes/cdn.test.ts`.

**Interfaces:**
- Consumes:
  - `cdnModel` (Task 4);
  - `cdn` router (Task 6);
  - the `SceneRuntime` additions (Task 3);
  - regions, `pace` and labels (Task 5).
- Produces:
  - `createCdnScene(o): SceneRuntime & { state: CdnState }`;
  - `CdnState { copies: { on: boolean; stale: boolean; flash: "" | "fill" | "purge" }[]; price: { origin: number; edge: number | null }; hasEdge: boolean }`;
  - `cdnLatencyMs(path: "direct" | "hit" | "miss", live: Outputs, rand): number`;
  - `COPY_COUNT = 24`.
- **Scene geometry (`cdnScene`):**
  - nodes `users` (kind users, "Users", "Mumbai"), `edge` (kind edge, "CDN edge", "Mumbai", `hidden: true`) and `origin` (kind origin, "Origin", "Virginia, USA");
  - regions `mumbai` ("Mumbai") and `virginia` ("Virginia, USA");
  - wires `u_origin` (pace 0.3, label "13,000 km"), `u_edge` and `edge_origin` (pace 0.3, label "13,000 km");
  - every node inside `bounds`.
- **Behaviour (spec §4, "The diagram"):**
  - `liveInputs` sets `edge` from the visible nodes. In `warm`, `filled` is `1 − exp(−max(0, t − 0.4) / 2.8)`; otherwise it is 1. In `purge`, it drops to 0 at 1.5 s and refills on the same curve.
  - In `stale` at 3 s, the origin price becomes `newPrice`, the edge price stays `oldPrice`, and every copy is marked stale. In `purge` at 1.5 s, the copies clear, then the edge price becomes `newPrice` on the first fill.
  - Price tags show when the mode is `stale` or `purge`, or when `inputs.purge === 1`.
  - Tiles, by id:
    - `page`: Page load;
    - `p95`: Slowest 5%;
    - `hits`: Edge hits, "—" with no edge;
    - `origin`: Origin load, /s;
    - the fifth: `rtt` (Round trip) unless the mode is `stale`/`purge` or `inputs.purge === 1`, then `stale` (Old price for).
  - `chart`: `{ label: "PAGE LOAD · LAST 30 S", output: "pageMs", max: 1000, danger: 300 }`. `chartSample` is `pageMs` ± 2%.
  - `legend`: request, from the edge, from the origin, copy stored.
  - The `wireStyles` draw `u_origin` only when there is no edge.
  - The 4-trip cue is a "×4 trips" chip on the active long wire, plus four quick hops when the step's `sim.speed` < 1.

- [ ] **Step 1: Write the failing tests** (`cdn.test.ts`, with the scene on `cdnScene`, inline steps per mode, and `rng(n)`):
  - `warms the edge from empty`: `filled` is 0 at t=0, and over 0.95 after 12 s of `update`.
  - `in the stale step the edge keeps the old price after the origin changes`: at 3.1 s, `price.origin` is 799, `price.edge` is 999, and every copy is stale.
  - `the purge step clears every copy, then serves the new price`.
  - `re-entering the stale step resets prices and copies` (Review Focus 2): purge, then `enterStep(stale)` → `price.edge` is 999 and the copies are not cleared.
  - `latency labels put about 5% of reads above p95`, run as for Caching: no edge, the default edge, and the edge at `ttlSec` 1.
  - `the fifth tile is the round trip before the price change and the stale time after`.
  - `shows no price tags before the old-price step`: `nodeBody` + `mount` + `paintWidgets` in jsdom; `[data-price]` elements are hidden.
- [ ] **Step 2: Run** `npx vitest run packages/stage/src/scenes`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the scene and its CSS, then register `cdn: createCdnScene`. Ledger that the Task 3 placeholder is gone.
- [ ] **Step 4: Run** `pnpm check`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(stage): CDN scene`.

### Task 8: CDN lesson content, cheatsheet and component card

**Files:**
- Create:
  - `content/system-design/cdn/steps.ts`, `cheatsheet.ts` and `lesson.ts`;
  - `content/components/cdn.json`.
- Modify: `content/index.ts` (`lessons: [caching, cdn]`), `content/components/index.ts`.
- Test: `content/content.test.ts`, `packages/stage/src/camera.test.ts`.

**Interfaces:**
- Consumes `cdnModel` and `cdnScene`.
- Produces the lesson `cdn`:
  - `home` "system-design", `slug` "cdn", `topic` "CDN", `title` "Serve Mumbai from Mumbai";
  - `minutes` 8, `level` 1;
  - `components` `["users","cdn","app-server"]`, `buildsOn` `["caching"]`, `questions` `[]`;
  - `cheatsheetInputs` `{edge:1, ttlSec:60, purge:1}`.
- **Controls:**
  - `originKm`: `{label:"Origin distance", min:1000, max:17000, step:500, unit:"km", readout:"One round trip across {originKm} km takes **{rttOriginMs}**. A page takes **{noEdgePageMs}** from there, or **{hitPageMs}** from the Mumbai edge."}`.
  - `ttlSec`: `{label:"Page TTL", min:10, max:3600, step:10, unit:"s", readout:"Each page is asked for {perPageRate} times a second, so with a {ttlSec} TTL **{edgeHitPct}** of reads stay in Mumbai and the origin sees **{originReqs}** a second."}`.
- **Steps**, in order (id · tag · sim · model · extras):

  | Id | Tag | Sim | Model | Extras |
  |---|---|---|---|---|
  | `far-away` | problem | `{mode:"direct", speed:1}` | `{edge:0}` | live "LIVE · no CDN" |
  | `add-edge` | technique | `{mode:"warm", speed:1}` | `{edge:1}` | `scene.add ["edge"]`; live "LIVE · edge warming up" |
  | `slow-mo` | technique | `{mode:"steady", speed:0.35}` | `{edge:1}` | controls `["originKm"]`; live "SLOW MOTION · 0.35×" |
  | `old-price` | problem | `{mode:"stale", speed:1}` | `{edge:1}` | live "LIVE · price changed at the origin" |
  | `purge` | solution | `{mode:"purge", speed:1}` | `{edge:1, ttlSec:60, purge:1}` | controls `["ttlSec"]`; live "LIVE · purge on change" |
  | `recap` | recap | `{mode:"steady", speed:1}` | `{edge:1, ttlSec:60, purge:1}` | |

  - Titles and the numbers each step quotes follow the spec's step table. Text quotes only outputs (Global Constraints).
  - The recap's `next` note says the cart and checkout still cross the ocean, and that moving the API close to users is a later lesson.
- **Cheatsheet:** the four sections in spec §4.
- **Component card `cdn`:** "CDN edge", icon `edge`, category `traffic`, with the spec's §4 points.

- [ ] **Step 1: Write the failing tests:**
  - `content.test`: `lists the CDN lesson as written and in order`. `lessonSummaries("system-design")` has `cdn` available at order 6, and `getLesson("system-design","cdn").title` is "Serve Mumbai from Mumbai".
  - The existing `passes every content check` covers quotes, modes, nodes and the stub match.
  - `camera.test`: `fits the CDN diagram in a 390 × 300 stage` (Review Focus 4). Every `cdnScene` node and region corner maps inside the stage with `fitView`.
- [ ] **Step 2: Run** `npx vitest run content packages/stage/src/camera.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write** the steps, cheatsheet, lesson and card, and register them.
- [ ] **Step 4: Run** `pnpm check`. Expected: all PASS, with no content problems.
- [ ] **Step 5: Commit** `feat(content): CDN lesson, cheatsheet and component card`.

### Task 9: Web — two lessons side by side, smoke test and README

**Files:**
- Modify:
  - `apps/web/app/[subject]/[slug]/page.tsx` (`<LessonPlayer key={lesson.id} …>`);
  - `apps/web/ui/lesson/TryIt.tsx` (non-% values grouped, with a space before the unit: "13,000 km", "60 s");
  - `apps/web/e2e/lesson_smoke.py`;
  - `README.md` (the "Adding a lesson" engine paragraph now describes the scene registry).
- Test:
  - `apps/web/ui/lesson/TryIt.test.tsx`, `apps/web/ui/ContinueCard.test.tsx`;
  - smoke checks against a fresh `next start`.

**Interfaces:**
- Consumes the lesson `cdn` from Task 8 and the `.tx-chartv` and `[data-tile=…] .tx-v` selectors.

- [ ] **Step 1: Write the failing tests:**
  - `TryIt.test`: `shows a distance as 13,000 km`, and `shows a TTL as 60 s`.
  - `ContinueCard.test`: `moves on to the next lesson once Caching is finished` → with targets `[caching, cdn]` and Caching done, the card shows the title "Serve Mumbai from Mumbai" and "Start here".
  - Smoke checks:
    - **`cdn_flow`.** Open `/system-design/cdn`; the h1 is "Serve Mumbai from Mumbai". Then:
      1. On step 1, `[data-tile=page] .tx-v` reads "787 ms" and the chart label holds at "787 ms".
      2. Arrow right ×2 reaches "Hit or miss, in slow motion", and `#ctl-originKm` is enabled.
      3. Arrow right ×2 reaches step 5. Focus `#ctl-ttlSec` and press Home; `[data-tile=hits] .tx-v` reads "97%".
    - **`lesson_switch`.**
      1. Open Caching and go to step 3.
      2. Click the CDN lesson in the lesson list.
      3. Expect the CDN step 1 title, `[data-tile=page]` present and `[data-tile=load]` absent.
    - **`subject_page`.** `/system-design` shows "2 of 20 open".
- [ ] **Step 2: Run** `npx vitest run apps/web`, then rebuild and run `python3 apps/web/e2e/lesson_smoke.py http://localhost:3123`. Expected: the new unit tests and smoke checks FAIL; the old 5 smoke checks PASS.
- [ ] **Step 3: Implement** the key, the `TryIt` formatting and the README paragraph.
- [ ] **Step 4: Run** `pnpm check`, `pnpm build` and the smoke test. Expected: all PASS, 8/8 smoke checks.
- [ ] **Step 5: Screenshot and look.** Shoot the CDN lesson at 1440x900 and 390x844 in both themes, on steps 1, 2, 4 and 5 (`--keys`), plus the cheatsheet. Check:
  - no overlap or cropping;
  - the ocean trip is visibly slower;
  - the price tags read correctly.
- [ ] **Step 6: Commit** `feat(web): CDN lesson live beside Caching`.

### Task 10: HLD lesson row

**Files:** the Tintelix High-Level Design (a Claude Doc, `d784e4ec-e410-4eab-8a68-c5ae13ed8339`): the lesson table row for CDN.

- [ ] **Step 1:** Replace the row's story "A user in Sydney waits on servers in Virginia; copies at the edge cut the round trips; hits at the edge vs trips to the origin" with "A learner in Mumbai waits on servers in Virginia; copies at a Mumbai edge cut the round trips; a stale price shows why pages need purge on change". Use a direct edit: the spec's approval covers it.
- [ ] **Step 2:** Read the row back to verify. Ledger it.
