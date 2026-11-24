# Lesson 53: Design a real-time leaderboard — design note

**Hook title:** Rank ten million players live. **Scene kind:** `board`. **Builds on:** caching (10),
sharding (15). **Sources:** Vintelix System Design 101, Chapter 55 (paraphrased: a server-side sorted set
is what a live leaderboard needs, persistence by snapshot and log). General public knowledge for skip
lists, folding time into the score for ties, rank-then-range for neighbours, and splitting by score range.
All numbers are the lesson's own and deliberately differ from the well-known textbook example.

## Assumptions (model defaults)

10 million players; 20 matches and 30 rank checks a player a day, 5× at peak; 0.1% at launch; a SQL rank
scanning half the score index at 10 million entries a second per core, 32 cores; a sorted-set instance at
100,000 operations a second, kept under 60%; about 100 bytes a player.

## What the numbers come to

11,574 updates and 17,361 rank checks a second at peak. SQL: 0.5 ms a rank at launch, 500 ms at full size,
27,127% busy. Sorted set: about 23 steps a lookup, 29% busy, 1 GB. A 100-million-player board: 5 shards at
58%, 10 GB.

## Steps

1 the ask · 2 a scores table and a count · 3 counting millions for every look · 4 a sorted set in memory ·
5 ties, neighbours, restarts · 6 more boards, bigger boards (Try it: players on one board) · 7 wrap-up.

## Engine changes in this PR

- `sortedset` custom widget (with a test): a slice of the board from rank 1,203, with your score climbing
  past others and the lookup's step count.
