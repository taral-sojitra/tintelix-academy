# Lesson 34: Design a key-value store — design note

**Hook title:** A store that always takes the write. **Scene kind:** `board`. **Builds on:** replication
(14), sharding (15), consistent hashing (16), Bloom filters (17), CAP (19), consistency models (20).
**Sources:** vector clocks, siblings, Dynamo vs DynamoDB vs Riak vs Cassandra from Vintelix System Design
101, Chapter 77; quorums, sloppy quorum, hinted handoff, read repair, Merkle-tree anti-entropy and gossip
are public knowledge from the 2007 Dynamo paper. All scenario numbers are the lesson's own.

## Assumptions (model defaults)

10 TB of carts and sessions, 2 TB usable per node; 100,000 reads and 20,000 writes a second; N = 3;
replicas answering in 4, 6 and 40 ms (one slow).

## What the numbers come to

One copy: 5 nodes, 2 TB each; a dead node takes 20% of keys with it. Three copies: 15 nodes. W = R = 2:
6 ms writes and reads, 0% stale reads. W = 1: 4 ms writes; W = 3: 40 ms. W = R = 1: 67% of reads miss a
fresh write (C(N−W, R) ÷ C(N, R)); W = 1, R = 2: 33%. Node B down: W = 2 still accepts 100%, W = 3 0%;
node D takes 4,000 hinted writes a second. Concurrent writes: 2 siblings, then one merged version.

## Steps

1 the ask (put/get, carts must stay writable) · 2 keys on a ring, one copy · 3 a node dies · 4 three
copies and quorums (Try it: W and R) · 5 a replica down: sloppy quorum and hinted handoff · 6 concurrent
writes, vector clocks and siblings · 7 wrap-up: read repair, anti-entropy, gossip.

## Engine changes in this PR

- `quorum` custom widget (with a test): N replica slots with the W written and R read, the down slot in
  red, and whether every read meets the latest write.

## Calls I made

- The widget's classes are `.tx-nwr…`: `.tx-qrow` already belongs to the queueing lesson.
- Step text quotes `hintRate`, not the growing `hintsHeld`, which only the tile shows (it follows the
  scene clock).
