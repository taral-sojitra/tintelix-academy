# Monolith vs microservices lesson ("Split it, or keep it whole?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 27 of System Design: a monolith keeps calls cheap and transactions simple, but every team shares one deploy line and it scales only as a whole; microservices let teams deploy and scale alone, at the price of network calls and availability that multiplies along a call chain. Start with a well-organised monolith; split when teams or load make it pay.

**Approach (my call).** A `micro` scene that swaps pictures between steps: one big "Monolith" box whose six modules light in turn as a request passes (steps 1 and 5), or six service boxes where Orders calls Users, Catalog, Payments and Shipping in turn over the network (purple) and searches go straight to Search (steps 2–4).

**Model.** 8 teams × 2 deploys = 16 a day; at 45 minutes, one at a time, the line is busy 12 hours a day; a team's own service deploys in 15 minutes. Checkout's 4 calls: 4 µs in process, 4,000 µs over 1 ms network calls. Five services at 99.9% in a chain: 99.5%, about 3 h 36 min down a month against 43.2 min. Scaling search ×10: 40 GB as whole-monolith copies, 10 GB as services (10 × 0.5 GB for search + 5 others × 2 × 0.5 GB).

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | monolith | One codebase, one deploy line | 16 deploys, 12 hours busy, 4 µs calls |
| 2 | split | Split it along team lines | 15-minute deploys, no shared line |
| 3 | network-calls | Every call is now a network call | 4,000 µs, 99.5%, 3 h 36 min a month |
| 4 | scale-hot-part | Scale only the part that's busy | 40 GB against 10 GB |
| 5 | recap | What splitting taught us | points to retries and circuit breakers |
