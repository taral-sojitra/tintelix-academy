# Health checks lesson ("Is anyone still there?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 8 of System Design, from *Vintelix System Design 101* §27.4 and Chapter 104: without checks a dead server quietly fails its share; active checks (or heartbeats) find it in interval × missed checks; over-eager ejection near capacity cascades until the fleet is empty; an ejection cap stops that. The recap separates liveness (restart?) from readiness (send traffic?).

**Approach (my call).** A `health` scene: users → balancer → a fleet of ten servers drawn as rows, each with a check dot that pulses on every check and a status ("check ok", "dead · missed 1 of 2", "slow · missed…", "out of rotation"), plus a "What happened" log that adds a line as each event occurs. The story plays in real seconds since the fault and restarts when the learner moves a control.

**Model.** Pure function of time since the fault (`elapsedSec`; its default is long after everything settles, so step text quotes the outcome). Round 1 at interval × threshold ejects the faulty server. If its share pushes the survivors past the per-server limit, they miss checks too and round 2 ejects as many as the cap allows. Served = healthy servers in rotation × min(load each, limit). Failing share, load per server and servers in rotation all come from it, and so do the tiles, the chart (requests failing) and the log.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | silent-death | A dead server still gets traffic | 10 servers, 800/s: 10% fail, 80 a second |
| 2 | heartbeats | Missed heartbeats give it away | every 5 s × 2 misses: found in 10 s, about 800 lost, then 0%; Try it: interval |
| 3 | cascade | Too eager to eject | 1,000/s, limit 110: survivors at 111, all 10 ejected by 20 s, 100% fail |
| 4 | eject-cap | Cap how many can leave | cap 10%: 9 stay, 99% served; Try it: cap |
| 5 | recap | What health checks taught us | liveness vs readiness |

**Left to the build.** Which survivors leave first under a cap is visual only (in server order). Visual traffic is sampled; every number on screen comes from the model.
