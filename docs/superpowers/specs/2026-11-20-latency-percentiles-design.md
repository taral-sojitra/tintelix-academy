# Latency percentiles lesson ("The average is lying")

Status: draft for Taral's approval · 2026-11-20 · builds on `2026-11-20-cdn-lesson-design.md` and the 30-lesson curriculum (PR #3)

## 1. Intent

Lesson 1 of System Design is now the first thing a new learner opens, so it also introduces the shop the later lessons keep using. Its idea is the one in chapter 4 of *Vintelix System Design 101*: an average describes nobody. A dashboard shows a calm 12 ms while one shopper in twenty waits 200 ms. Once a page makes several calls, the slow one becomes the normal page.

It is the third kind of diagram, and the first whose main picture is a chart rather than boxes and wires. The scene registry from the CDN lesson was built for exactly this, so no player changes are expected.

**Success looks like this:**
- A learner can explain why the average of a fast-and-slow mix lands where no request lives.
- They can read p50 and p99 off a histogram, and say what each means.
- They can say why a page that makes 10 calls is slow far more often than any one call.
- They can name one fix for the tail (hedged requests) and its cost.
- New learners see "Start here · System Design · Lesson 1 of 30", and that lesson is open.

## 2. Goals, non-goals, anti-goals

**Goals**
1. A six-step lesson with a live diagram, numbers from a model, three "Try it" sliders, and a printable cheatsheet. Same quality bar as Caching and CDN.
2. A new scene kind, `latency`, added through the registry with no change to the player.
3. Caching and CDN look and behave exactly as they do today.

**Non-goals**
- Queueing and why the slow hump grows under load. That is lesson 2; the recap points to it.
- Averaging percentiles across servers or time buckets, and coordinated omission. Cheatsheet lines only.
- Realistic spread inside each hump. The model uses two values (fast and slow); the drawing may scatter dots a little around them, as Caching's chart line carries noise.
- A new component card. The lesson uses the existing Users and App server cards.
- Practice questions.

**Anti-goals** (failures even if it works)
- A number on the stage disagrees with the step text (unchanged from the first slice).
- A percentile marker or label drawn from the sampled dots instead of the model.
- The lesson implies p99 is a rare event that only touches 1% of users. The fan-out step exists to prevent that.
- The lesson implies hedging is free, or that it fixes a request that is slow everywhere.
- A stated fact with no source behind it (see §6).

## 3. Approaches

**Engine**
- **A. A `latency` scene in the registry, with the histogram drawn as a big node widget. (Picked.)** Requests still travel as packets from Users to the product service, so the lesson looks like the rest of the course. Each finished request drops a dot into a histogram panel, which is a node whose body the scene paints, like the CDN edge's page grid.
- **B. A chart-only stage with no nodes or wires.** Rejected. The player assumes a router, packets and tiles, so this means player changes for one lesson, and learners lose the "requests flowing through a system" picture they get everywhere else.
- **C. Reuse the existing chart strip as the histogram.** Rejected. The strip is a time series, 30 seconds wide; a histogram needs its own axis and markers.

**Twist** (the "problem" after the first fix)
1. **Fan-out, then hedged requests. (Picked.)** It is the book's §4.3 and §4.7 argument and the core of Dean and Barroso's "The Tail at Scale". It turns "p99 is rare" into "p99 is the normal page".
2. **Averaging p99s across servers.** A real dashboard trap, but it needs two servers and two histograms to show, and is hard to animate honestly. Cheatsheet line.
3. **Coordinated omission.** Too advanced for lesson 1. Cheatsheet line.

You handed me the "how" ("Now write code"). These picks are my calls, not decisions you made.

## 4. The lesson

**Hook title:** "The average is lying" (20 characters). It goes into the subject stub, which has no hook title today. **Topic:** Latency percentiles. **Builds on:** nothing. **Components:** Users, App server. **Minutes:** 8. **Level:** 1.

**Promise:** "Read a latency histogram and see why p99, not the average, is what your users feel."

**Story.** The shop's product page. Most requests are answered in 2 ms; one in twenty takes the slow path (a cold cache, a garbage-collection pause, a busy disk) and takes 200 ms. The figures are the book's §4.2 example, so book readers meet the same numbers.

### Steps

| # | id | Tag | Title (≤ 40) | What the learner sees | Numbers quoted (model outputs) |
|---|---|---|---|---|---|
| 1 | calm-dashboard | problem | The dashboard says 12 ms | Requests flow from shoppers to the product service. Only the average tile and the chart are lit; the chart sits flat near 12 ms. Some requests visibly take far longer. Support says the page hangs. | `meanMs` 12 ms |
| 2 | two-humps | technique | Two humps, nothing in between | The histogram appears and each finished request drops a dot into it. 95% pile up at 2 ms, 5% at 200 ms. The average's marker sits in the empty valley: no request took 12 ms. p50 and p99 markers appear. At a million requests a day, 50,000 shoppers a day wait 200 ms. | `fastPct` 95% · `slowPct` 5% · `fastMs` · `slowMs` · `meanMs` · `callP50Ms` 2 ms · `callP99Ms` 200 ms · `perDay` 1,000,000 · `slowPerDay` 50,000 |
| 3 | watch-the-tail | technique | Watch p99, not the average | **Try it: slow share** (0.1–10%). Dragged across 1%, p99 jumps from 2 ms to 200 ms while the average barely moves. | readout: `slowPct`, `meanMs`, `callP99Ms` |
| 4 | fan-out | problem | Ten calls, and one is slow | The page now calls 10 services in parallel and waits for the slowest. Only 1% of calls are slow, yet 9.6% of pages wait 200 ms. **Try it: calls per page** (1–100). At 100 calls, 63% of pages are slow and even the median page takes 200 ms. | model `{slowPct: 1, calls: 10}` · `pageSlowPct` 9.6% · `pageP50Ms` · `pageP99Ms` 200 ms |
| 5 | hedge | solution | Ask twice, keep the first answer | If a call hasn't answered after 10 ms, the page sends a copy to another server and keeps whichever answers first. Only 1% of calls need a copy, and page p99 falls to 12 ms. **Try it: hedge after** (1–250 ms). Too early (under 2 ms) copies every call; too late (over about 198 ms) never helps. | model `{slowPct: 1, calls: 10, hedge: 1}` · `hedgeMs` 10 ms · `hedgedPct` 1% · `pageP99Ms` 12 ms · `pageSlowPct` 0.1% |
| 6 | recap | recap | What the tail taught us | Report p50 and p99, never only the average. Every extra call per page is another chance to be slow. Hedging trims the tail for a small, known amount of extra work, and only when the slowness belongs to one server. Coming up: Queueing, where the slow hump grows as a server gets busy. | At the recap's inputs: `meanMs`, `pageP99Ms`, `hedgedPct`. The recap does not quote 12 ms, 9.6% or 63%, because they are not outputs at its inputs. |

Each step's text, notes and "What changed" lines quote model outputs as `{name}`, exactly as Caching and CDN do. Titles are working titles; the builder may polish them within 40 characters.

**Notes** (one per step where it helps):
- Step 2 (watch): the average is not wrong arithmetic; it answers a question nobody asked.
- Step 4 (turn): your p90 can be a p99 somewhere else; the more calls a page makes, the deeper into the tail it reaches.
- Step 5 (watch): hedging helps when the slowness belongs to the server (a pause, a busy disk). A request that is slow everywhere, such as the biggest customer's huge cart, is just sent twice.

### Model (pure, in `content/system-design/latency-percentiles/model.ts`)

**Inputs and defaults:**

| Input | Default | Meaning |
|---|---|---|
| `fastMs` | 2 | Latency of a fast call |
| `slowMs` | 200 | Latency of a slow call |
| `slowPct` | 5 | Share of calls that are slow, in % |
| `perDay` | 1000000 | Requests a day |
| `calls` | 1 | Calls a page makes in parallel; the page waits for the slowest |
| `hedge` | 0 or 1 | Whether a late call gets a backup copy |
| `hedgeMs` | 10 | How long a call may run before its copy is sent |

Let s = slowPct / 100, f = fastMs, S = slowMs, H = hedgeMs, N = calls.

**One call.**
- Without hedging it takes f with probability 1 − s, and S with probability s.
- With hedging, a call still running at H gets a copy, which is itself slow with probability s, independently. The call ends at the first answer:
  - f with probability 1 − s;
  - min(S, H + f) with probability s(1 − s);
  - S with probability s².

**A page** takes the slowest of its N calls.

**Percentiles** use the nearest-rank rule: pX is the smallest value v with P(latency ≤ v) ≥ X/100, compared with a 1e-9 tolerance. So with exactly 1% slow, 99% of calls are fast and p99 is the fast value. The cheatsheet says so in one line.

**Outputs:**

| Output | Formula |
|---|---|
| `fastPct` | 100 − slowPct |
| `meanMs` | mean of one call (with hedging when on): (1 − s)f + s(1 − s)·min(S, H + f) + s²S; without hedging (1 − s)f + sS |
| `callP50Ms`, `callP99Ms` | percentiles of one call, without hedging (steps 1–3 never hedge) |
| `pageP50Ms`, `pageP99Ms` | percentiles of a page: P(page ≤ v) = P(call ≤ v)^N over the call's possible values |
| `pageSlowPct` | 100 × (1 − (1 − q)^N), where q = s² if hedging and H + f < S, else q = s |
| `hedgedPct` | hedging off: 0; H < f: 100; H < S: slowPct; otherwise 0 |
| `slowPerDay` | perDay × s |
| echoes | `fastMs`, `slowMs`, `slowPct`, `perDay`, `calls`, `hedgeMs` |

**Check values** for the model test:

| Case | Expected |
|---|---|
| Defaults | meanMs 11.9; callP50Ms 2; callP99Ms 200; slowPerDay 50,000; fastPct 95; pageSlowPct 5 |
| slowPct 0.9 | meanMs ≈ 3.78; callP99Ms 2 |
| slowPct 1.1 | meanMs ≈ 4.18; callP99Ms 200 |
| slowPct 1 | callP99Ms 2 (nearest rank) |
| slowPct 1, calls 10 | pageSlowPct ≈ 9.56; pageP50Ms 2; pageP99Ms 200 |
| slowPct 1, calls 100 | pageSlowPct ≈ 63.4; pageP50Ms 200 |
| slowPct 1, calls 10, hedge, H 10 | hedgedPct 1; pageP99Ms 12; pageSlowPct ≈ 0.1; meanMs ≈ 2.12 |
| … H 1 | hedgedPct 100; pageP99Ms 3 |
| … H 199 | hedgedPct 1; pageP99Ms 200; pageSlowPct ≈ 9.56 |
| … H 250 | hedgedPct 0; pageP99Ms 200 |

### Number formatting (shared `formatOutput`, test-first)

One new rule: **percentages under 10 that aren't whole keep one decimal** ("9.6%", "0.5%", "0.1%"). Today they round to whole numbers, which would show 9.6% as "10%" and 0.1% as "0%".

- The test that pins Caching's and CDN's step outputs as formatted strings must pass unchanged. If any pinned string changes, the builder narrows the rule rather than changing the string.
- *My call:* while Caching's hit rate warms up from 0, its tile may show one decimal for the moments it is under 10%. That is the only visible change to existing lessons.

Times stay as they are: "12 ms" for 11.9, "200 ms".

### The diagram

**Layout.** Users on the left, the product service in the middle, and a services pool on the right (hidden until step 4). Under them, across the full width, a histogram panel (hidden in step 1).

**Requests.** In steps 1–3, a request travels from Users to the product service, waits there for its latency, then returns.
- Slow requests must visibly wait about 10× longer than fast ones. That is slow motion, not real time (200 ms against 2 ms would be invisible), the same honesty rule as the CDN's ocean wire: the visual ratio may be compressed, and the labels always show the model's milliseconds.
- On return, a latency label appears above Users ("2 ms" or "200 ms"), and a dot drops into the histogram.
- The share of slow requests follows the live `slowPct`.

**Fan-out (steps 4–6).** The product service sends the page's calls to the services pool, which shows one cell per call (drawn up to 20 cells, with a "×N" chip beyond that). Cells finish fast or slow; the page returns when its last cell is done, and its dot lands in the histogram, which now shows page latency. In `hedge` mode, a cell still running at the hedge time gets a second pulse (the copy) and usually finishes early.

**The histogram.**
- Log-scale x axis, 1 ms to 1,000 ms, ticks at 1, 10, 100 and 1,000.
- Bars come from the model's distribution (call or page, by mode); the falling dots are the visual sample.
- The slow hump must be clearly visible at a 1% share. A square-root height scale, or a clipped fast bar with its share printed on it, are both fine; the printed shares are the true ones.
- Markers, each labelled from the model: average (amber, dashed), p50 (green), p99 (red). The average marker visibly sits in the empty valley in step 2.

**Tiles (5).**

| Tile | Step 1 | Steps 2–3 | Steps 4–6 |
|---|---|---|---|
| Average | `meanMs` | `meanMs` | `meanMs` |
| p50 | — | `callP50Ms` | Page p50 `pageP50Ms` |
| p99 | — | `callP99Ms` | Page p99 `pageP99Ms` |
| Slow | — | Slow requests `slowPct` | Slow pages `pageSlowPct` |
| Fifth | — | Slow a day `slowPerDay` | Extra calls `hedgedPct` |

The four dashes in step 1 are the point: the dashboard shows one number.

**Chart.** "Dashboard average · last 30 s", plotting `meanMs` on a 0–250 ms scale with a dashed line at 100 ms (a visual cue, never stated in text). It stays calm through the whole lesson, which is the lesson. As in Caching, the label shows the model's value and only the line carries noise.

**Scene modes.**

| Mode | Behaviour |
|---|---|
| `average` | Requests flow; histogram hidden; percentile tiles show "—" |
| `histogram` | Dots fall into the call histogram; markers shown |
| `fanout` | Pages fan out to the services pool; page histogram |
| `hedge` | As `fanout`, with copies sent at `hedgeMs` |

Reduced motion, phone layout and keyboard behave as in Caching and CDN. On a 390 px phone the histogram keeps its axis labels readable and nothing is cropped.

### Cheatsheet

1. **Read the histogram, not the average.** A fast-and-slow mix averages to a value nobody experiences. Report p50 and p99 (and p99.9 where escalations come from), each with its load level.
2. **The numbers.** 95% at 2 ms and 5% at 200 ms average 12 ms; p50 is 2 ms, p99 is 200 ms. At a million requests a day, 5% slow is 50,000 slow requests a day.
3. **Fan-out.** A page that makes N calls is slow with probability 1 − (1 − s)^N: 1% slow calls make 9.6% of 10-call pages slow, and 63% of 100-call pages.
4. **Hedged requests.** Send a copy once a call outlives the fast hump; keep the first answer. The extra load is the share of calls still running at that moment. It helps only when the slowness belongs to one server.
5. **Dashboard traps.** Never average p99s across servers or minutes; merge the histograms, then take the percentile once. A load test that waits for each reply before sending the next never sees a stall (coordinated omission).
6. **Percentile rule used here:** nearest rank.

`cheatsheetInputs`: none beyond the defaults, except where a line quotes fan-out or hedging figures, which use `{slowPct: 1, calls: 10}` and `{…, hedge: 1}` the same way the CDN cheatsheet does. Builder's call on how to split it, as long as every number is a model output.

## 5. Engine changes

**Schema** (`packages/schema`)
- `SCENE_KINDS` adds `"latency"`; `SCENE_MODES.latency = ["none", "average", "histogram", "fanout", "hedge"]`.
- Node kinds add `"histogram"` and `"services"`.
- `formatOutput`: the percentage rule above, test-first.

**Stage** (`packages/stage`)
- New `routers/latency.ts` (pure, tested like the CDN router) and `scenes/latency.ts`, registered in `scenes/index.ts`.
- The wait inside the product service is the builder's call (a delay hop in the router, or held in the scene's update), as long as the router stays pure and tested.
- New icons in the existing style: services (a small stack of boxes) and histogram (bars). *Builder's art.*

**Content**
- `content/system-design/latency-percentiles/` with `lesson.ts`, `model.ts`, `model.test.ts`, `scene.ts`, `steps.ts` and `cheatsheet.ts`, as for CDN.
- The subject stub for `latency-percentiles` gains the hook title "The average is lying".
- The lesson becomes open simply because its file exists. The subject page then reads "3 of 30 open".

**Web.** No changes expected beyond data. If the player turns out to assume something only Caching and CDN satisfy, the builder fixes it in the player, guarded by the existing tests.

## 6. Facts and their sources

| Fact used | Value | Source |
|---|---|---|
| Fast/slow mix and its average | 2 ms, 200 ms, 95%; mean 11.9 ms | *Vintelix System Design 101*, §4.2 |
| A million requests a day at p99 | 10,000 slow a day (scaled here to 5%: 50,000) | Same book, §4.2 |
| Fan-out makes the tail common | 1 − 0.99¹⁰ = 9.6%; 1 − 0.99¹⁰⁰ = 63% | Same book, §4.3 and §4.7; Dean and Barroso, "The Tail at Scale", *Communications of the ACM*, February 2013 |
| Hedged requests | Send a backup after the first is late; keep the first answer | Dean and Barroso 2013 |
| Slow requests cluster on the same users | Biggest accounts, coldest caches | Same book, §4.7 |
| Never average percentiles | Merge histograms, quantile once | Same book, §4.3 |

No outside latency measurements are quoted. The 2 ms and 200 ms are the book's teaching values, and the lesson says so ("say most requests take 2 ms…").

Any number added to the step text later needs a row here first.

## 7. Constraints

Same stack and rules as the first slice and the CDN lesson: Next.js 16 on Vercel, pnpm workspace, Zod schemas, pure models, `{output}` quoting checked at build time, titles ≤ 40 characters, no HTML from content, Warm and Blueprint themes, reduced motion, phone layout. Light pages still load neither the engine nor Zod (smoke check 5).

## 8. Acceptance

- `pnpm check` and `pnpm build` pass. Existing tests pass unchanged, including the pinned Caching and CDN strings.
- The smoke test grows to cover this lesson:
  - it loads, and the arrows step through;
  - step 3: the slow-share slider at 0.9% shows p99 2 ms, and at 1.1% shows p99 200 ms, while the average reads 4 ms both times;
  - step 4: the calls slider at 100 shows 63% slow pages;
  - step 5: page p99 reads 12 ms;
  - the chart label matches the model;
  - the cheatsheet quotes the model.
- The subject page reads "3 of 30 open". A new learner's Home card reads "Start here · System Design · Lesson 1 of 30" with "The average is lying".
- Going between this lesson and Caching or CDN via the lesson list never carries one lesson's step, tiles or overrides into the other.
- Screenshots at 1440 and 390 px, both themes, show the histogram's valley, markers and slow hump clearly.

## 9. Builder check

I read this as its builder, without going back to Taral. Gaps I found and settled:
- p99 at exactly 1% slow was ambiguous; the nearest-rank rule now decides it, and a test pins it.
- 9.6% and 0.1% would have shown as "10%" and "0%"; the new formatting rule covers it, guarded by the pinned strings.
- The recap wanted to quote 12 ms and 9.6%, which are not outputs at its inputs; dropped.
- Hedging after 199 ms looked like it should help; with a 2 ms reply it cannot beat 200 ms, so the model and a check value now say so.
- The step 1 tiles needed a defined state; they show "—".

No question needs Taral's answer before building.

## 10. Left to the builder

- Exact coordinates, icon art, colours within the palette.
- The histogram's height scale and dot animation, within §4.
- The visual time ratio between fast and slow (about 10×).
- Wording within the facts above.
- File-level structure inside the packages.
