# Scaling lesson ("Bigger box or more boxes?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 5 of System Design, from *Vintelix System Design 101* §3.1 and §5.3–5.4: scaling up is simple until the biggest machine runs out and its single point of failure bites; scaling out has no ceiling but needs work that splits, and shared parts cap the gain (Amdahl) and then reverse it (Universal Scalability Law: σ 3%, κ 0.05% peaks near 44 servers at 13.6×; 100 servers give 11.2×).

**Approach (my call).** A `scale` scene: one big server whose core grid fills (steps 1–2), replaced by a load balancer, a fleet grid and the model's throughput-vs-servers curve with a linear reference line and the traffic level (steps 3–5). Requests beyond capacity come back red as dropped. Per-core rate 200/s (Chapter 95); biggest machine 64 cores is the lesson's own assumption.

| # | id | Title | Model |
|---|---|---|---|
| 1 | scale-up | Scale up: a bigger box | 6,000/s; Try it: cores |
| 2 | ceiling | The biggest box runs out | 20,000/s on 64 cores: 12,800/s, 64% served |
| 3 | scale-out | Scale out: more boxes | 16 servers, nothing shared: 25,600/s; Try it: servers |
| 4 | shared-parts | Shared parts bend the curve | σ 3%, κ 0.05%: 10× and 16,306/s; peak 44 servers |
| 5 | recap | What scaling taught us | |
