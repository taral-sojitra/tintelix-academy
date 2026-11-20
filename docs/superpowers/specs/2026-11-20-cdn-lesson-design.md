# CDN lesson ("Serve Mumbai from Mumbai") and a scene-agnostic player

Status: draft for Taral's approval · 2026-11-20 · builds on `2026-11-20-phase1-first-slice-design.md`

## 1. Intent

Tintelix teaches system design by letting learners watch a system work and change one thing at a time. The second lesson in the Speed module is the CDN: a learner in Mumbai waits on a server far away, and copies kept at the edge, close to the learner, cut out the long round trips.

The lesson continues the Caching story. The same flash sale is now being visited from Mumbai, and the shop's servers sit in US East (N. Virginia), where many teams deploy by default.

It is also the first lesson with a different diagram, so the player has to stop assuming every lesson is the Caching diagram. That engine change is half of this work, and it is what makes lessons 3 to 20 cheaper.

**Success looks like this:**
- A learner can explain why distance, not server speed, makes a far-away site slow.
- They can say what an edge copy saves.
- They can name the stale-content trap and its fixes: purge on change, a short time to live (TTL) for pages, and versioned names for files.
- Caching looks and behaves exactly as it does today.

## 2. Goals, non-goals, anti-goals

**Goals**
1. A six-step CDN lesson with a live diagram, numbers from a model, two "Try it" sliders, and a printable cheatsheet. It has the same quality bar as Caching.
2. A player that picks the diagram by lesson. Everything Caching-specific moves into the Caching scene.
3. Two lessons that live side by side:
   - The subject page shows 2 of 20 open.
   - Home moves on to the CDN once Caching is finished.
   - Moving between lessons never carries one lesson's state into the other.

**Non-goals**
- The "page you can't cache" story (carts, personal pages) is only a "Coming up" note in the recap.
- Origin shields, many edge locations, a world map, real geography or real network measurement.
- Request collapsing as an animation. It is a cheatsheet line only.
- Practice questions for the lesson.
- AWS changes.
- New site areas.
- Changes to the Caching lesson's content.

**Anti-goals** (failures even if it works)
- A number on the stage disagrees with the step text. This is the first slice's anti-goal 1, unchanged.
- Caching looks or behaves differently after the refactor.
- The lesson implies a CDN makes everything fast. The recap must say what it does not fix.
- A stated fact with no source behind it (see §6).
- Anything that looks like a real map product.

## 3. Approaches

**Engine**
- **A. A scene registry, with Caching's parts moved into its scene. (Picked.)**
  - `lesson.scene.kind` chooses a scene factory.
  - The scene owns its routing, legend, request rate and queues, node widgets, chart metric and tiles.
  - The player keeps the loop, steps, inputs, controls, keys, camera, canvases and saving.
  - Cost: a careful refactor guarded by the existing tests.
- **B. A fully declarative engine.** Routes, widgets and effects would all be data. Rejected: two lessons are still too few to design that without guessing, which is the same reason the first slice rejected it.
- **C. A second player just for CDN.** Rejected: it duplicates the loop, controls, keyboard and progress code, leaving two engines to keep in step.

**Twist**
1. **Stale price. (Picked.)** It continues the flash-sale story and is the CDN mistake people actually make.
2. **The page you can't cache.** Moved to the recap as "Coming up".
3. **A cold edge.** Out of scope.

Taral handed the "how" to me ("write the full design with my picks"). These picks are my calls, not decisions he made.

## 4. The lesson

**Hook title:** "Serve Mumbai from Mumbai" (31 characters). **Topic:** CDN. **Builds on:** Caching. **Components:** Users, CDN edge (new card), App server (as the origin).

**Story setting.** The first Tintelix spec said only that a user far away waits on distant servers, and the HLD's lesson table tells it as Sydney and Virginia. Here it is Mumbai and Virginia:
- it matches the hook title;
- it matches the audience;
- Tintelix itself is served from Mumbai.

*My call.* The HLD row should be updated to match after approval.

**Currency:** ₹. *My call*: the story is in Mumbai, and site-wide currency is still an open question.

### Steps

| # | id | Tag | Title (≤ 40) | What the learner sees | Numbers quoted (model outputs) |
|---|---|---|---|---|---|
| 1 | far-away | problem | Mumbai waits on Virginia | No edge. Every request crosses the ocean to the origin and back. A page needs 4 round trips: connect, secure, the page, then its files. | `rttOriginMs` 192 ms · `pageMs` 787 ms · `originReqs` 6,000 a second |
| 2 | add-edge | technique | Keep copies in Mumbai | An edge server appears in Mumbai, empty. Each first request for a page misses and fetches from Virginia, and later requests hit in Mumbai. The hit rate climbs as the edge warms. | `hitPageMs` 42 ms · `missPageMs` 252 ms · `edgeHitPct` 99.9% |
| 3 | slow-mo | technique | Hit or miss, in slow motion | Slow motion. Green trips stay in the city; amber trips cross the ocean. **Try it: origin distance** (1,000–17,000 km). | `rttOriginMs`, `noEdgePageMs`, `hitPageMs` in the readout |
| 4 | old-price | problem | The old price won't go away | Three seconds in, the origin's price drops from ₹999 to ₹799. The edge keeps serving ₹999, because its copy is good for an hour. | `oldPrice` ₹999 · `newPrice` ₹799 · `staleSec` 60 min |
| 5 | purge | solution | Purge on change, keep pages short | A purge clears the page from the edge, so the next request fetches ₹799. Pages get a short TTL; versioned files keep a year. **Try it: page TTL** (10 s – 1 h). | `staleSec` 1 s · `edgeHitPct` 99.4% · `originReqs` 33 a second |
| 6 | recap | recap | What the edge bought us | Page load 787 → 42 ms; origin 6,000 → 33 a second; a price change shows in about a second. Note: the cart and checkout are personal, so they still go to Virginia. Moving the API close to users is a later lesson. | `noEdgePageMs` → `hitPageMs`, `traffic` → `originReqs`, `staleSec`. The recap does not quote the one-hour figure, because it is not an output at the recap's inputs. |

Each step's text, notes and "What changed" lines quote model outputs as `{name}`, exactly as Caching does. Titles above are working titles; the builder may polish the wording within 40 characters.

### Model (pure, in `content/system-design/cdn/model.ts`)

**Inputs and defaults:**

| Input | Default | Meaning |
|---|---|---|
| `traffic` | 6000 | Page requests a second from Mumbai |
| `pages` | 2000 | Product pages |
| `originKm` | 13000 | Distance to the origin |
| `edge` | 0 or 1 | Whether there is an edge server |
| `ttlSec` | 3600 | How long the edge keeps a page |
| `purge` | 0 or 1 | Whether changes are purged |
| `filled` | 1 | Share of pages the edge holds a copy of. The `warm` mode animates it from 0, as Caching's warm-up animates its hit rate. |
| `oldPrice` | 999 | Product price before the change (₹) |
| `newPrice` | 799 | Product price after the change (₹) |

**Constants**, each with a comment giving its source (§6):
- `TRIPS = 4`
- `EDGE_RTT_MS = 10`
- `ORIGIN_SERVE_MS = 20`
- `EDGE_SERVE_MS = 2`
- `PURGE_SEC = 1`

**Outputs:**

| Output | Formula |
|---|---|
| `rttOriginMs` | 2 + 0.0146 × originKm |
| `rttEdgeMs` | EDGE_RTT_MS |
| `noEdgePageMs` | TRIPS × rttOriginMs + ORIGIN_SERVE_MS |
| `hitPageMs` | TRIPS × rttEdgeMs + EDGE_SERVE_MS |
| `missPageMs` | TRIPS × rttEdgeMs + rttOriginMs + ORIGIN_SERVE_MS (the edge keeps a warm connection to the origin, so a miss costs one ocean round trip) |
| `perPageRate` | traffic / pages |
| `edgeHitPct` | with an edge: 100 × filled × λT / (1 + λT), where λ = perPageRate and T = ttlSec; with no edge: 0 |
| `originReqs` | edge ? traffic × (1 − hit) : traffic |
| `pageMs` (typical) | no edge → noEdgePageMs; else hit ≥ 0.5 ? hitPageMs : missPageMs |
| `p95` | no edge → noEdgePageMs; else (1 − hit) > 0.05 ? missPageMs : hitPageMs |
| `staleSec` | purge ? PURGE_SEC : ttlSec |
| echoes | `traffic`, `pages`, `originKm`, `ttlSec`, `oldPrice`, `newPrice` (so text and the stage's price tags quote them, never typed numbers) |

**Check values** for the model test, at the defaults:

| Case | Expected |
|---|---|
| Defaults | rttOriginMs ≈ 191.8; noEdgePageMs ≈ 787; hitPageMs 42; missPageMs ≈ 252 |
| Edge, T = 3600 | edgeHitPct 99.99; originReqs ≈ 0.56 |
| Edge, T = 60 | edgeHitPct ≈ 99.45; originReqs ≈ 33 |
| Edge, T = 1 | edgeHitPct 75; p95 = missPageMs |
| originKm 1000 | rttOriginMs 16.6 |

The hit-rate formula assumes requests spread evenly over the pages (3 a second each). The cheatsheet says so in one line. The real lesson for learners is that a short TTL costs little on a busy page.

### Number formatting (shared `formatOutput`, test-first)

| Kind of number | Rule |
|---|---|
| Names ending `Sec` | A duration: under 120 s → "N s"; under 120 min → "N min"; else "N h" |
| Percentages strictly between 99 and 100 | One decimal, rounded down, so 99.99 shows "99.9%" and never "100%" |
| Other plain numbers under 10 that aren't whole | One decimal ("0.6") |
| Names ending `Price` | Rupees, grouped ("₹999") |

None of this may change any value Caching shows today. A test pins Caching's step outputs as formatted strings before and after.

### The diagram

**Layout.** A wide, stylized layout with two labelled regions, "Mumbai" on the left and "Virginia, USA" on the right. Between them is a long "ocean" wire labelled with the distance and round trip, for example "13,000 km · 192 ms round trip". It is not a map.

**Nodes.** Users (Mumbai), CDN edge (Mumbai, hidden until step 2) and Origin (Virginia).
- The edge shows a grid of page copies, like Caching's key grid: fresh copies green, stale amber, purged cleared.
- The origin shows its load meter.
- In steps 4–6 both show a price tag: the origin "₹799"; the edge "₹999" while stale.

**Wires.**
- `u_origin` is the direct path in step 1, removed in step 2.
- `u_edge` and `edge_origin`.

**Travel time.** The ocean trip must visibly take about 10–20× longer than the in-city trip. A per-wire `pace` multiplier slows packets on long wires. One trip on the ocean wire at 1× takes no more than about 3 s.

**Showing the 4 round trips.** Step 1 shows that one page needs 4 round trips. *My suggestion:* a small "×4 trips" chip on the active path, plus four quick hops in slow motion. The builder may choose another way that shows it honestly.

**Latency labels** above Users are drawn so they agree with the model, as Caching's now do:
- hits within hitPageMs;
- misses near missPageMs;
- with no edge, near noEdgePageMs;
- about 5% of all reads above `p95`.

**Tiles (5).**
- Page load (typical)
- Slowest 5%
- Edge hits (shows "—" with no edge)
- Origin load (per second)
- The fifth: "Round trip" in steps 1–3, "Old price for" (`staleSec`) in steps 4–6.

**Chart.**
- "Page load · last 30 s", plotting `pageMs` on a 0–1,000 ms scale.
- A dashed line at 300 ms. *My call*: it is a visual cue only, never stated as a fact in text.
- The label shows the model's value; only the line carries noise, as in Caching.

**Scene modes.**

| Mode | Behaviour |
|---|---|
| `direct` | No edge |
| `warm` | Edge filling from empty |
| `steady` | |
| `stale` | Price changes at 3 s; edge copies turn amber |
| `purge` | Copies clear together, then refill green; refill requests to the origin are visible as a short burst |

Reduced motion, phone layout and keyboard behave exactly as in Caching. On a 390 px phone the ocean wire shortens with the camera, and nothing is cropped.

### Cheatsheet

1. **When a CDN helps.** Learners are far from the origin, and most responses are the same for everyone.
2. **What to cache, for how long:**

   | Kind | Rule |
   |---|---|
   | Versioned files (`app.3f9a.js`) | A year, immutable |
   | Pages | Short TTL plus purge on change |
   | Personal pages | Never cache (`private`, `no-store`) |

3. **The numbers.**
   - One round trip ≈ 2 + 0.0146 ms × km.
   - A page needs about 4.
   - 787 ms → 42 ms.
4. **Changing cached content.**
   - Purge, by URL or tag.
   - Versioned names.
   - A purge sends a burst to the origin. The edge should send one request per page and hold the rest (request collapsing).

### New component card

`cdn` ("CDN edge"): what it is, when to use it, what it costs (staleness, purge discipline), and a one-line contrast with the in-app cache from Caching.

## 5. Engine changes (the scene registry)

**Schema** (`packages/schema`)
- `SceneSpec.kind: "cache-aside" | "cdn"`, required. Caching's `scene.ts` gets `kind: "cache-aside"`.
- Node kinds add `"edge"` and `"origin"`.
- `SceneSpec.regions?`: labelled background boxes, each `{ id, label, x, y, w, h }`.
- Wires add `pace?` (a speed multiplier, default 1) and `label?` (text drawn along the wire).
- `SCENE_MODES`: a map from scene kind to its allowed `sim.mode` values. `checkContent` rejects a step whose mode its scene kind doesn't support.
- `checkContent` also picks up the deferred checks that now matter:
  - every node lies inside `scene.bounds`;
  - step `scene.add`, `remove` and `focus` ids exist;
  - `step.model` keys are model inputs;
  - each written lesson matches its subject stub (slug, topic, hook title).

**Stage** (`packages/stage`)
- `SceneRuntime` grows to own:
  - `legend`;
  - `sim` settings: rate per second and queues;
  - `chart`: label, output name, max, danger line;
  - `nodeBody(id)`: escaped markup for the widgets inside a node;
  - `paintWidgets(display, ctx)`.
- `scenes: Record<SceneKind, SceneFactory>` is the registry; `createPlayer` uses `scenes[lesson.scene.kind]`.
- `player.ts` and `render/dom.ts` lose every Caching-specific line: `LEGEND`, `R_VIS`, `MU_VIS`, the cache/DB/app meters, keys, the TTL ring, the `"cache"` new badge and the "DB LOAD" label. All of it moves into `scenes/cache-aside.ts` unchanged in behaviour.
- New: `routers/cdn.ts` (pure, tested like the cache-aside router) and `scenes/cdn.ts`.
- New icons in the existing style: an edge (a small globe with a node) and an origin (a server with a flag). *Builder's art.*

**Web** (`apps/web`)
- `LessonPlayer` is keyed by lesson id (the deferred minor, now a real bug with two lessons).
- Lesson numbering, the subject page and Home's card need no changes beyond data: the CDN lesson becomes available when its lesson file exists.

**Order of work**
1. Refactor with no behaviour change. Prove Caching is identical:
   - all 102 tests;
   - the 5 smoke checks;
   - side-by-side screenshots at 1440 and 390 px in both themes.
2. Then the CDN model, content, router, scene, cheatsheet and card.

## 6. Facts and their sources

| Fact used | Value in model | Source |
|---|---|---|
| Mumbai ↔ N. Virginia round trip | ≈ 192 ms at 13,000 km | Measured ap-south-1 ↔ us-east-1 ≈ 193 ms (economize.cloud AWS latency tables) |
| Round trip inside the city | 10 ms | Same-metro round trips are single-digit ms (techplained, India cloud latency 2026); a region-to-Cloudflare-Mumbai p50 of 10.9 ms (Prisma connectivity report 2024); 10 ms allows for the last mile |
| Round trips per page | 4 | TCP handshake 1 + TLS 1.3 handshake 1 + the page 1 + its files 1 |
| Purge time | 1 s | Vercel: purges propagate globally in ~300 ms (Vercel changelog); other CDNs range from sub-second to tens of seconds. Rounded up to 1 s. |

Any number added to the step text later needs a row here first.

## 7. Constraints

- Same stack and rules as the first slice:
  - Next.js 16 on Vercel;
  - pnpm workspace;
  - Zod schemas;
  - pure models;
  - `{output}` quoting checked at build time;
  - titles ≤ 40 characters;
  - no HTML from content;
  - Warm and Blueprint themes;
  - reduced motion;
  - phone layout;
  - the Hobby plan's non-commercial limit.
- Light pages must still load neither the engine nor Zod (smoke check 5).

## 8. Acceptance

- `pnpm check` and `pnpm build` pass. All existing tests pass unchanged, except tests that move with the code they cover.
- The smoke test grows to cover the CDN lesson:
  - it loads, and the arrows step through;
  - the step 3 distance slider's readout matches the tiles;
  - in step 5, the TTL slider at 10 s shows 97% edge hits;
  - the chart label matches the model;
  - the cheatsheet quotes the model.
- After Caching is finished, Home's card says "Start here · System Design · Lesson 6 of 20" with the title "Serve Mumbai from Mumbai".
- Going from Caching to CDN via the lesson list never shows Caching's step, tiles or overrides.
- Caching screenshots before and after the refactor match by eye at 1440 and 390 px, in both themes.

## 9. Builder check

I read this document as its builder, without going back to Taral. Running it through a separate reviewer would have meant starting another agent unasked. Each gap I found was a call a sensible builder could make, so I settled it above:
- The warm-up needed a model input (`filled`).
- The prices needed to come from the model (`oldPrice`, `newPrice`, plus a `Price` format rule).
- The recap needed a figure that isn't an output at its inputs, so it was dropped.
- A test expectation had the wrong rounding (97%, not 96.8%).
- Home's card wording didn't match the real card.

No question needs Taral's answer before building.

## 10. Left to the builder

- Exact coordinates.
- Icon art.
- Colours within the palette.
- Wording within the facts above.
- How the 4 round trips are shown.
- The `pace` value.
- File-level structure inside the packages.
