# Queueing lesson ("Busy, then suddenly slow")

Status: built on Taral's go-ahead ("write code and create pull request") · 2026-11-20 · follows `2026-11-20-latency-percentiles-design.md`

## 1. Intent

Lesson 2 of System Design. Lesson 1 ended on "why the slow hump grows as a server gets busy"; this answers it. Its idea comes from *Vintelix System Design 101*, §4.6 and §5.1–5.2: waiting grows as busy ÷ (1 − busy), so a server that looks fine at 80–90% busy is already several times slower, and Little's law counts what that costs.

**Success:** a learner can say why a half-busy server already makes requests wait, read the utilization curve, use Little's law (inside = arrivals × time), and argue that headroom is response time bought, not waste.

**Non-goals:** queue limits and load shedding, many-server pools beyond four workers, Amdahl's law and the Universal Scalability Law, a component card, practice questions.

**Anti-goals:** a number on stage that disagrees with the text; a queue animation whose behaviour contradicts the model (it must use random arrivals and random work times at the model's busyness); implying that "90% busy, 10% spare" is safe.

## 2. Approaches

- **A. A `queue` scene: requests join a visible line in front of 1–4 workers, plus a curve panel that plots the model's response time against busyness. (Picked.)** The line shows bunching; the curve shows the shape.
- **B. Reuse the Caching scene's database queue.** Rejected: that scene is about a cache; its single queue and fixed work time would make waits half the model's.
- **C. Curve only, no requests.** Rejected: bunching is the reason for the wait, and it has to be seen.

Taral asked for code directly, so these picks are my calls.

## 3. The lesson

**Hook title:** "Busy, then suddenly slow". **Topic:** Queueing and utilization. **Builds on:** Latency percentiles. **Components:** Users, App server.

| # | id | Tag | Title | What the learner sees | Model |
|---|---|---|---|---|---|
| 1 | half-busy | problem | Half busy, and already waiting | One worker, 10 ms of work per request, 50 arriving a second: 50% busy, yet a request waits 10 ms in line, 20 ms in all | `{traffic: 50}` |
| 2 | the-curve | technique | The curve bends, then goes vertical | The curve panel; **Try it: traffic** (10–99 a second) | `{traffic: 50}` |
| 3 | evening-peak | problem | The evening peak | 90 a second: 90% busy, 90 ms wait, 100 ms response (10× its work), 9 requests inside (Little's law) | `{traffic: 90}` |
| 4 | add-worker | solution | Add a worker, buy headroom | A second worker on the same line: 45% busy each, 12.5 ms response. **Try it: workers** (1–4) | `{traffic: 90, workers: 2}` |
| 5 | recap | recap | What the line taught us | Busyness, not speed alone, sets the wait; Little's law; keep headroom. Coming up: Availability | `{traffic: 90, workers: 2}` |

### Model (`content/system-design/queueing/model.ts`)

Inputs: `traffic` 50 (requests a second), `serviceMs` 10, `workers` 1. Workers share one line (M/M/c: random arrivals, random work times). Let A = traffic × serviceMs / 1000 (busy workers on average), c = workers; A is capped at 0.995 c so the line stays finite.

| Output | Formula |
|---|---|
| `capacity` | c × 1000 / serviceMs |
| `utilPct` | 100 A / c |
| `sparePct` | 100 − utilPct |
| `waitChancePct` | 100 × Erlang C(c, A) |
| `waitMs` | Erlang C × serviceMs / (c − A) |
| `responseMs` | waitMs + serviceMs |
| `slowdown` | responseMs / serviceMs |
| `inSystem`, `inLine` | Little's law: traffic × responseMs / 1000, traffic × waitMs / 1000 |
| `slowdownAt50/80/90/95` | one worker at that busyness: 1 / (1 − ρ) = 2, 5, 10, 20 |
| echoes | `traffic`, `serviceMs`, `workers` |

Check values: traffic 50 → wait 10, response 20, inside 1. 80 → 40 / 50. 88 → wait ≈ 73.3. 90 → 90 / 100, slowdown 10, inside 9. 95 → 190 / 200. Two workers at 90 → busy 45%, wait ≈ 2.54, response ≈ 12.54.

### Stage

- **Requests** arrive at random (Poisson) and each worker's work time is random (exponential), in slow motion at a tenth of the real rates, so the line on stage forms and clears as the model says. A request joins the shortest of the workers' lines (close to one shared line). A finished request shows its own time above Users (sim seconds × 100 = ms).
- **Product service** shows the waiting line as dots and one slot per worker.
- **Curve panel**: the model's response time against busyness for the current workers (0–99% busy, 0–250 ms, clipped), with a dot and label at the current point.
- **Tiles:** Busy, Wait in line, Response, Inside (Little's law), Traffic. **Chart:** "RESPONSE · LAST 30 S", `responseMs`, 0–250 ms.
- **Engine:** scene kind `queue` (mode `steady`); node kind `curve`; `SceneRuntime.update` also receives the sim so a scene can set its rates; queues can draw exponential work times.

### Facts and sources

| Fact | Source |
|---|---|
| Wait ≈ S·ρ/(1−ρ); 1×, 4×, 9×, 19× at 50/80/90/95% | Vintelix System Design 101 §4.6, §5.2 (M/M/1) |
| L = λW | Same book §5.1 (Little, 1961) |
| Headroom is the latency you bought | Same book §4.6 |
| Two workers on one line | Erlang C (standard M/M/c result) |
