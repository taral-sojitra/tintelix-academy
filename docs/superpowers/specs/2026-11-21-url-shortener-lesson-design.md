# Lesson 32: Design a URL shortener — design note

**Hook title:** Turn a long link into seven characters. **Scene kind:** `board` (first case study on it).
**Builds on:** estimation (4), caching (10), sharding (15). **Sources:** general public knowledge only;
every number is the lesson's own stated assumption (no figures, text or worked numbers from Alex Xu's
books or the liquidslr notes).

## Assumptions (model defaults)

30 million new links a day; 40 clicks per link; kept 5 years at 400 bytes a row; codes of 7 base-62
characters; one database answering 5,000 reads a second; a cache answering 90% of clicks; 100 clicks a
second at launch; 30% of clicks are repeats.

## What the numbers come to

| Output | Value | Formula |
|---|---|---|
| writeRate | 347 a second | 30e6 ÷ 86,400 |
| readRate | 13,889 a second | writeRate × 40 |
| linksB / storageTb | 55 billion / 22 TB | 30e6 × 365 × 5; × 400 B |
| codeSpaceB / codesUsedPct | 3,522 billion / 1.6% (96% at 6, 100% at 5) | 62^len; links ÷ 62^len |
| dbBusyPct | 2% launch, 278% full, 28% cached | db reads ÷ 5,000 |
| dbFailPct | 64% at full traffic | 1 − 100 ÷ busy |

## Steps

1. The ask (still board): requirements and the two rates. 2. API and data (API panel): two calls, one
table, 55 billion rows. 3. First design (mode 0): one app tier, one database, launch traffic. 4. It
breaks (mode 1): 278% busy, 64% of clicks fail. 5. Cache (mode 2, Try it: hit rate). 6. Codes that never
clash (mode 3, Try it: code length): a counter written in base 62, shown live by the code-maker widget.
7. Wrap-up: 301 vs 302, sharding, counter blocks, regional caches.

## Board

Flows: `read` (fails at the database by `dbFailPct`), `readHit`, `readMiss` (asks the cache, then the
database; the detour isn't repeated on the way home), `writeDirect` (modes 0–2), `write` via the code
maker (mode 3). Writes are drawn 1 in 6 (the legend says so); the model has 1 in 41. Widgets: database
meter + failure line, cache meter, the base-62 counter, the API log.

## Calls I made

- `writeDirect` added beside the plan's `write`, so writes still flow before the code maker exists.
- `clickRate` and `cacheMissPct` added to the model for the users subtitle and the miss flow's weight.
- The counter's sample id is a year's worth of links (newPerDay × 365), not an arbitrary number.
- Live text and the Try it readout use billions (`codeSpaceB`) so they stay right at 5–8 characters; the
  counter widget says "out of codes" when the number needs more characters than allowed.
