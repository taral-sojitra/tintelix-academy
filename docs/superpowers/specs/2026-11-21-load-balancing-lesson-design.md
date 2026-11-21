# Load balancing lesson ("Who gets the next request?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 6 of System Design (shared with Microservices and Networks), from *Vintelix System Design 101* Chapter 27: round robin is fair by count but blind to an expensive endpoint; least connections follows the live load; a layer 7 balancer can read the request and route by path; least connections' fails-fast trap needs health checks.

**Approach (my call).** A `balance` scene: shoppers → balancer → three servers, each with a visible line of lookups (cyan) and reports (amber), plus a panel comparing every policy's lookup time from the model at the current traffic. Requests carry their own work time (10 ms lookups, 200 ms reports, 2% reports, 150/s: this lesson's own example), so a report visibly blocks a line.

**Model.** Random arrivals; round robin as each server on its own line (M/G/1, Pollaczek–Khinchine); least connections as one shared line (M/G/3, Allen–Cunneen); by path as lookups on two servers and reports on one (M/D/1). Overload reads "overloaded", never a made-up number.

| # | id | Title | Lookups |
|---|---|---|---|
| 1 | one-server | One server takes everything | overloaded, 48% served |
| 2 | round-robin | Round robin takes turns | 82 ms; Try it: reports share |
| 3 | least-connections | Least connections watches the load | 27 ms; Try it: traffic |
| 4 | layer-7 | Layer 4 or layer 7 | 16 ms (reports 350 ms on their own server) |
| 5 | recap | What balancing taught us | |
