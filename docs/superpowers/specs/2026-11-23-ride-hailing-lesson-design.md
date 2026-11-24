# Lesson 44: Design ride hailing — design note

**Hook title:** A car for every rider in seconds. **Scene kind:** `board`. **Builds on:** proximity service
(42), nearby friends (43). **Sources:** Vintelix System Design 101, Chapter 133 (paraphrased: the ping
firehose against trip writes, an in-memory cell index, the rider's cell and its neighbours, claim before
offer, Little's Law for matches in flight, hot cells and drivers going silent). General public knowledge
for H3's hexagons and S2. Nothing from the excluded notes or books.

## Assumptions (model defaults)

From the book: 5 million drivers pinging every 4 s at about 100 bytes; 20 million trips a day with 6 state
changes each; 1,000 match requests a second taking about 2 s each; the rider's cell plus six neighbours.
The lesson's own: a trips database taking 50,000 writes a second; 1% of the fleet at launch; about 6 free
drivers per cell.

## What the numbers come to

1,250,000 pings a second against 1,389 trip writes (about 900 to 1); 125 MB a second if every ping were
kept. One database for both: 28% busy at launch, 2,503% at full size (96% of writes fail). With the
in-memory index the database carries trip writes only (2.8%); matching sees about 42 candidates. Little's
Law: 2,000 matches in flight (4 s matching: 4,000).

## Steps

1 the ask · 2 one database at launch · 3 pings drown the trips · 4 the in-memory driver index · 5 claim
before offering (Try it: time to match) · 6 stadiums and tunnels · 7 wrap-up.

## Engine changes in this PR

- `dispatch` custom widget (with a test): one match playing out over five 1.5 s phases (rank, claim,
  claimed, offer, accepted); when the race flow is on, a second rider's claim on the same driver fails
  and it takes the next one.
