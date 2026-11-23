# Lesson 37: Design a search engine — design note

**Hook title:** Find it among a billion pages. **Scene kind:** `board`. **Builds on:** indexing (13),
sharding (15), web crawler (36). **Source:** Vintelix System Design 101, Chapter 139 (requirements,
capacity estimate, 202-queued API, inverted index, sharded fan-out and merge, why LIKE fails, indexing
lag and Elasticsearch's 1-second refresh, TF-IDF and signal backfill, hot terms cached with a short TTL),
paraphrased. The example documents in the index picture are the lesson's own.

## Numbers (chapter 139's, plus the lesson's own where marked)

2 billion documents of 2 KB; 80 million new or changed a day = 926 a second (2,778 at 3× peak); 200
million searches a day = 2,315 a second (6,944 at peak); 4 TB text + 4 TB index = 8 TB. A LIKE scan at 5
million rows a second: 400 s (shown as 7 min) a query. Lesson's own: a first design on 1 million documents
(200 ms); 0.2 TB of index per shard → 20 shards; 30 ms for a fanned-out query; 1 s through the pipeline,
so 2 s to searchable at a 1 s refresh (11 s at 10 s); a trending term at 30% of peak = 2,083 a second, 80%
from cache, 417 to the shards.

## Steps

1 the ask · 2 LIKE on a small table · 3 LIKE on two billion rows · 4 the inverted index, sharded · 5 the
indexing pipeline and lag (Try it: refresh interval) · 6 a trending term and a results cache · 7 wrap-up:
ranking.

## Calls I made

- Mode 0 is an overview with no traffic, so the ask shows the real corpus's numbers, not the small one.
- `scanMs` for the small corpus and `scanSec` for the full one, since durations under 120 s print as whole
  seconds and 0.2 s would read "0 s".
- No new widget: the inverted index is a log of three sample documents, two postings and their
  intersection.
