# Lesson 35: Design a distributed rate limiter — design note

**Hook title:** One limit across a thousand servers. **Scene kind:** `board`. **Builds on:** rate limiting
(24), API gateway (26). **Source:** Vintelix System Design 101, Chapter 86.6–86.7 (an in-process limit
multiplies by the number of instances; a shared Redis counter with INCR and an expiry, made atomic with
Lua or a GCRA module; 429, Retry-After and X-RateLimit headers as GitHub and Stripe use them). Fail open
vs closed and sharding counters are general practice. All numbers are the lesson's own.

## Assumptions (model defaults)

600 requests a minute per key; 20 gateways, round robin; a normal key sends 5 a second, a greedy one
150; 160,000 requests a second in all; one Redis node handling about 100,000 operations a second.

## What the numbers come to

Local counters: each gateway sees 7.5 a second (75% of its limit), so a 150-a-second key is allowed in
full, 15× its limit (up to 200 a second). One shared counter: exactly 10 a second allowed, 93% refused;
160,000 checks a second make one store 160% busy. Sharded: 2 shards 80%, 4 shards 40%. A dead shard of 4,
failing open, leaves 25% of keys unchecked.

## Steps

1 the ask · 2 local counters, a normal key · 3 a greedy key: twenty limits · 4 one shared counter (atomic
INCR + EXPIRE) · 5 counters sharded by key (Try it: shards) · 6 a shard dies: fail open vs fail closed ·
7 wrap-up: 429 and the rate-limit headers.

## Calls I made

- No new widget: the existing bars, meter, text and log widgets cover it.
- `limitRate`, not `limitPerSec`, which the formatter would print as a duration.
