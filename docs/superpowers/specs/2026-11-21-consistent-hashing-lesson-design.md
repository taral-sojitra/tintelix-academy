# Consistent hashing lesson ("Add a server, move few keys")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 16 of System Design, from *Vintelix System Design 101* §45.4–45.5: adding a server under hash mod N moves N ÷ (N + 1) of the keys; on a hash ring the new server takes only its own arc; one point per server gives uneven arcs; virtual nodes even them out.

**Approach (my call).** A `ring` scene: app → a "Cache servers" panel → database on a miss. For mod N the panel shows 48 keys as coloured squares (colour = owning server); for the ring it draws an SVG circle with server points and keys. A fifth server joins 2 s into each step: keys that changed server get an outline, and for 5 s their reads miss and go to the database (the chart shows cache misses).

**Model.** Mod N: moved = N ÷ (N + 1) (80% for 4 → 5). Ring: a fixed, seeded ring (`@tintelix/schema/ring`, shared by the model and the stage); moved = the new server's measured share (19% here), largest share = max over the 5 servers (36% with one point each, 22% with 100). Misses = moved share while warming.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | mod-n | Hash mod N moves almost every key | 80% (800,000 keys); Try it: servers before |
| 2 | ring | Put keys and servers on a ring | 19% move |
| 3 | uneven | One point each makes uneven arcs | largest 36% against a fair 20% |
| 4 | virtual-nodes | Virtual nodes even it out | largest 22% with 100 points; Try it: points per server |
| 5 | recap | What the ring taught us | points to Bloom filters |

**Rulings.** The ring helpers live in the schema package so the stage never imports lesson content. Shares are measured on this lesson's fixed ring, so they are close to (not exactly) the textbook 1 ÷ (N + 1).
