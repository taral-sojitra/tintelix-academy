# Availability lesson ("Nobody broke their promise")

Status: built on Taral's standing go-ahead (build every lesson, one PR each, review at the end) · 2026-11-21

**Intent.** Lesson 3 of System Design, from *Vintelix System Design 101* §3.2–3.3: availabilities multiply along a path, so five services that each keep a 99.9% promise give a 99.50% checkout (3 h 39 min of failure a month); copies multiply the other way, but only as far as they are independent, and a shared failure sets the answer.

**Approach (my call).** A `chain` scene: up to six services in a row, each showing its copies; requests cross them and stop at the first service with no working copy. Outages on stage happen 100× as often as in the model, said in the legend and step 1; every number in tiles, text and the arithmetic panel comes from the model.

| # | id | Title | Model |
|---|---|---|---|
| 1 | every-team-green | Nobody broke their promise | defaults (5 services at 99.9%) → 99.5%, 3 h 39 min a month |
| 2 | every-hop | Every hop costs you | Try it: services 1–6; each would need 99.98% |
| 3 | two-copies | Two copies of everything | copies 2 → 99.9995%, 13 s; Try it: copies 1–3 |
| 4 | shared-fate | Copies that fail together | copies 2, shared 0.05% → 99.7%, 1 h 50 min; Try it: shared failure |
| 5 | recap | What the nines taught us | as step 4; the MTBF/MTTR lever |

**Model.** tier down = u^copies + shared (shared only with 2+ copies); path = (1 − tier down)^services; downtime over a 730.5-hour month. The requirement each service needs is rounded up.

**Formatting.** New `*Avail` (shown to the first non-nine digit, rounded down) and `*Downtime` ("13 s", "43.8 min", "3 h 39 min", "3.7 days"); shares under 1% keep two decimals ("0.05%"). Caching and CDN strings stay pinned.

**Sources.** Book §3.2 (table of nines, MTBF ÷ (MTBF + MTTR)), §3.3 (0.999⁵ = 99.50%, 3 h 39 min; p² + q with q = 0.05%).
