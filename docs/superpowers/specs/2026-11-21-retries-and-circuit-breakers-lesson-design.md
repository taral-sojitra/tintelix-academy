# Timeouts, retries and circuit breakers lesson ("Don't kick a slow service")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 28 of System Design: every network call needs a timeout that fits inside its caller's budget; retrying a slow service multiplies its load until almost nothing succeeds; exponential backoff with jitter spreads the retries out but doesn't remove them; a circuit breaker stops the calls for a while so the service can recover, and shoppers get a quick error instead of a long wait.

**Approach (my call).** A `retry` scene: Shoppers → Order service → Pricing, with a Circuit breaker node that joins in step 4. Step 1 adds a "Timeout budget" panel with nested bars (shopper 1,000 ms, gateway 800 ms, order work + pricing + tax timeouts). Pricing shows a connection-pool meter and, in steps 2–3, one wave of retries as four 100 ms bars. A scene clock drives the breaker (closed while failures pile up, open for 10 s, then closed after test calls pass) and resets on every step and input change. Breaker state comes from the unsmoothed model output.

**Model.** Budget: 50 ms work + 400 ms pricing + 250 ms tax = 700 ms of the gateway's 800 ms, 100 ms spare (−300 ms with an 800 ms pricing timeout). Slow pricing: 500 calls/s × 400 ms needs 200 connections of 50, so it finishes 125 a second. Retries at a 300 ms timeout, 3 tries: 1,500 calls/s offered, 0% succeed, shoppers wait 900 ms for an error. Jitter: backoff 100 → 400 ms; a wave's busiest 100 ms drops from 500 to 125. Breaker: trips after 2 s, open 10 s (0 offered, 0 ms wait), then closed again at 100% in 40 ms.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | timeout-budget | Every call needs a timeout that fits | 700 ms used, 100 ms spare; Try it: pricing timeout |
| 2 | retry-storm | A slow service, then a retry storm | 200 of 50 connections, 1,500/s offered, 0%, 900 ms |
| 3 | jitter | Back off, with jitter | wave peak 500 → 125, still 0% |
| 4 | breaker | A circuit breaker gives it room | open 10 s, then 100% in 40 ms |
| 5 | recap | What timeouts and breakers taught us | points to leader election |

**Honesty.** Every number on screen comes from the model. Packets are a sample (2.4 a second), not 500. The breaker runs on a fixed timeline (trip at 2 s, open 10 s, a countdown on the node); the cheatsheet gives the real rule, a failure rate over a window (commonly 50%), and the half-open test calls.
