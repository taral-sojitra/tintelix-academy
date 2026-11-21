# Case-study modules for System Design: short design

Status: draft for Taral's review · 2026-11-21

## Intent

System Design teaches 30 building blocks one at a time. Learners preparing for interviews, and engineers moving into architect roles, also need to see the blocks combined into whole systems: a URL shortener, a chat app, a payment system. This adds case-study lessons that build one system each, step by step, on the same lesson engine, linking back to the building-block lessons they use.

The idea came from reviewing `liquidslr/system-design-notes`. Its topic list is a useful checklist, but its content can't be used. It is unlicensed, it summarises Alex Xu's copyrighted *System Design Interview* books, and its 392 images appear to be the book's figures.

## Goals, non-goals, anti-goals

- **Goals:**
  - Every case study from that checklist, plus the case studies in our own source book, in one ordered list.
  - The same honesty rules as the building-block lessons: every number on screen comes from the lesson's model, and anything exaggerated is labelled.
  - Each case study links to the lessons it builds on.
- **Non-goals (for now):**
  - Timed interview mode and leaderboards (the HLD has these as "later").
  - Design Lab reference designs, though the scene format below is chosen so the Lab can load them later.
- **Anti-goals:**
  - Copying anything from `liquidslr/system-design-notes` or Alex Xu's books: text, figures, or their worked example numbers.
  - Case studies that re-teach a building block at length instead of linking to its lesson.

## Constraints

- **Sources:**
  - *Vintelix System Design 101*, the book every lesson so far is built from. Its §126 gives the method, and §§127–141 have 15 case-study chapters.
  - For topics the book doesn't cover as a case study: public primary sources (papers, engineering blogs, official docs), with the book's concept chapters for the theory (§41 geospatial, §62 Kafka, §68 stream windows, §77 clocks, and so on).
- **Hook titles:** 40 characters at most, as now.
- **Engine:** the existing lesson engine and player. No new page type.

## Approaches

1. **A new hand-built scene for every case study,** as for the 30 lessons. Best fidelity, but each needs its own router, scene and styles; 29 of them would take as long as the whole subject so far.
2. **One data-driven "design board" scene, plus a widget library (recommended).** This is a new scene kind, `board`:
   - Boxes and wires come from the lesson's scene spec.
   - Requests flow along routes declared per step: colour, rate, failure share.
   - Small widgets come from a shared library, taken from the existing scenes: meter, cells grid, queue lane, hash ring, log list, bars, timeline, histogram and chips.

   A case study is then mostly data: scene, flows, model and steps. When a deep dive needs a new picture (a trie, an order book), it's added to the library once and is reusable. The trade-off is less bespoke interactivity than approach 1.
3. **Reuse the existing scenes step by step** (step 3 shows the caching scene, step 4 the sharding scene). This is rejected: the learner never sees one system come together, and each scene is tied to its own model.

## Lesson shape

Each case study has about seven steps, following the book's method (§126), and takes 8–10 minutes:

1. **The ask:**
   - Requirements and non-goals.
   - Tiles show the model's estimate: requests a second, storage, bandwidth.
2. **API and data:** the two or three calls and the main tables or keys, shown on the board.
3. **First design:** the simplest thing that works; requests flow through it.
4. **It breaks:** one load or failure, with the model's numbers, overwhelms the first design.
5. **Deep dive 1:** the key mechanism, with its own widget and a Try-it control.
6. **Deep dive 2:** the second mechanism or a failure case.
7. **Wrap-up:**
   - Bottlenecks, trade-offs and single points of failure.
   - A "built from" list linking to the building-block lessons.

The topic tag reads "Design a URL shortener" and so on; the hook title is the situation.

## The lessons

**Five new modules, lessons 31–59.**

- **Sources:** *Book* is a *Vintelix System Design 101* chapter; *Public* is papers and engineering blogs.
- **Columns:** *Builds on* is existing lesson numbers. *New widget* is what the library doesn't have yet.

### Module 9: The method and the classics

| # | Topic | Proposed hook title | Source | Builds on | New widget |
|---|---|---|---|---|---|
| 31 | How to approach a design problem | Forty-five minutes, one whiteboard | Book §126 | 4 | step clock |
| 32 | Design a URL shortener | Turn a long link into seven characters | Public | 4, 10, 15 | base-62 counter |
| 33 | Design a unique ID generator | Never hand out the same ID twice | Book §77, Public | 15, 29 | ID bit layout |
| 34 | Design a key-value store | A store that always takes the write | Book §77, Public (Dynamo) | 14–17, 19–20 | quorum N/W/R, vector clock |
| 35 | Design a distributed rate limiter | One limit across a thousand servers | Book §§60, 86 | 24, 26 | shared counter |
| 36 | Design a web crawler | Read the whole web, politely | Public | 17, 22 | URL frontier |
| 37 | Design a search engine | Find it among a billion pages | Book §139 | 13, 15, 36 | inverted index |
| 38 | Design search autocomplete | Guess the query after two letters | Public | 10, 15 | trie with top-k |

### Module 10: Social and real time

| # | Topic | Proposed hook title | Source | Builds on | New widget |
|---|---|---|---|---|---|
| 39 | Design a notification service | A million alerts, none sent twice | Book §138 | 22–24, 28 | channel lanes |
| 40 | Design a photo feed (news feed) | Fill the home feed in a blink | Book §129 | 10, 18, 25 | (reuses fan-out) |
| 41 | Design a chat app (one-to-one, groups, channels) | Delivered, read, and in order | Book §§127, 130 | 8, 22, 25, 33 | connection and presence |
| 42 | Design a proximity service | Places within two kilometres | Book §41, Public | 10, 13, 14 | geohash grid |
| 43 | Design nearby friends | Which friends are close right now? | Public | 25, 41, 42 | pub/sub channels |
| 44 | Design ride hailing | A car for every rider in seconds | Book §133 | 42, 43 | dispatch matcher |
| 45 | Design maps and navigation | The fastest way home | Public | 11, 42 | map tiles, road graph |

### Module 11: Media and files

| # | Topic | Proposed hook title | Source | Builds on | New widget |
|---|---|---|---|---|---|
| 46 | Design video streaming (YouTube, Netflix) | Upload once, play anywhere | Book §128 | 11, 18, 22 | transcode pipeline |
| 47 | Design cloud storage and file sync (Drive, Dropbox) | Edit on a laptop, see it on a phone | Book §§131–132 | 18, 20 | block sync |
| 48 | Design S3-like object storage | Store a trillion files, lose none | Public | 14, 18 | erasure coding |
| 49 | Design an email service | An inbox for a billion people | Book §32, Public | 15, 18, 37 | (reuses others) |

### Module 12: Data pipelines

| # | Topic | Proposed hook title | Source | Builds on | New widget |
|---|---|---|---|---|---|
| 50 | Design a distributed message queue | A queue that keeps every message | Book §62 | 14, 22, 29 | partitions and offsets |
| 51 | Design metrics monitoring and alerting | Spot the outage before users do | Book §§33, 101 | 1, 3, 8 | time series, rollups |
| 52 | Design ad click aggregation (analytics) | Count every click exactly once | Book §§68, 140 | 22, 23, 50 | time windows, watermark |
| 53 | Design a real-time leaderboard | Rank ten million players live | Book §55, Public | 10, 15 | sorted set |
| 54 | Design a RAG and model-serving system | Answer from your own documents | Book §141 | 10, 22, 26 | retrieval funnel |

### Module 13: Money and orders

| # | Topic | Proposed hook title | Source | Builds on | New widget |
|---|---|---|---|---|---|
| 55 | Design hotel booking | Never sell the same room twice | Book §134 | 21, 23 | locking timeline |
| 56 | Design orders and inventory | Sell only what's on the shelf | Book §§135, 137 | 21, 22, 23 | (reuses saga log) |
| 57 | Design a payment system | Take the money exactly once | Book §136 | 21, 23, 28 | double-entry ledger |
| 58 | Design a digital wallet | Move money between wallets safely | Public | 15, 21, 57 | event log |
| 59 | Design a stock exchange | Match a buy and a sell in microseconds | Public | 22, 33 | order book |

## Concepts the case studies need that we don't teach yet

**Taught in the case study that needs them now; full lessons later in the subject they belong to.**

- **Unique IDs and clock skew, LSM trees, vector clocks, gossip, Merkle trees:** in lessons 33 and 34 (System Design).
- **Polling, long polling, WebSockets and presence:** in lesson 41; full lesson later in APIs or Networks.
- **Geohash and quadtrees:** in lesson 42; full lesson later in DSA.
- **Tries:** in lesson 38; full lesson later in DSA.
- **Stream windows and exactly-once:** in lesson 52 (System Design).
- **Optimistic and pessimistic locking:** in lesson 55; full lesson later in SQL.
- **Event sourcing, try-confirm-cancel and saga patterns:** in lessons 56 and 58; full lessons later in Microservices.

## Delivery

- **PR 1:** the `board` scene kind, the widget library (taken out of the existing scenes without changing how they look), and lesson 32 as the pilot.
- **Then one PR per lesson**, module by module in the order above, stacked like lessons 7–30. Each PR gets:
  - model tests;
  - a smoke check;
  - a pass of the stage layout check (`stage_audit.py`).
- **Subject page:** the five modules are added as stubs in the first PR, so the subject page shows "30 of 59 open" and the roadmap is visible.

## Left to the builder

- Exact numbers in each model, taken from the sources above.
- Widget visuals.
- Final hook titles within the 40-character rule.
- Whether a lesson needs six steps or eight.
