# Proxies lesson ("Who speaks for whom?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 7 of System Design (shared with Computer Networks), from *Vintelix System Design 101* §19.5 and Chapter 28: a forward proxy acts for clients (one outgoing address, filtering, a shared cache); a reverse proxy acts for servers (hidden backends, TLS in one place, routing by path); and buffering stops slow clients from holding server workers, except on streams.

**Approach (my call).** A `proxy` scene with two pictures. Step 1: an office goes out through a forward proxy to a download site; most downloads come back from the proxy's copy. Steps 2–5: laptops and phones come in through a reverse proxy to a backend drawn as a 10 × 10 grid of workers. Phones sit on a slow wire. Without buffering the grid overflows (red); with buffering a few cells are lit. The busy-workers chart and the "slow network" label show only in the reverse picture.

**Model.** Forward: total download = staff × update size; through the proxy, one copy. Reverse: Little's law, busy workers = traffic × hold time. Without buffering a worker is held for its work plus the client's download (a weighted mix of fast and slow clients); with buffering, for its work plus the local hand-off. Served share = workers ÷ busy workers, capped at 100%; most traffic = workers ÷ hold time.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | forward | A forward proxy speaks for the office | 100 GB → 0.2 GB, 99.8% saved; Try it: staff |
| 2 | reverse | A reverse proxy speaks for the servers | TLS, hidden backends, routing |
| 3 | slow-phones | Slow phones hold the workers | held 334 ms, 134 busy of 100, 75% served; Try it: slow clients |
| 4 | buffering | Buffering frees the workers | held 21 ms, 8.4 busy, most 4,762/s; not for streams |
| 5 | recap | What proxies taught us | points to Heartbeats and health checks |

**Left to the build.** Visual traffic is sampled (4 a second) and every number on screen comes from the model.
