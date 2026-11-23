# Lesson 50: Design a distributed message queue — design note

**Hook title:** A queue that keeps every message. **Scene kind:** `board`. **Builds on:** replication
(14), message queues (22), leader election (29). **Sources:** Vintelix System Design 101, Chapter 62
(paraphrased: a topic as an append-only log in partitions, order only within a partition and keys such as
an order ID, offsets per group, groups splitting partitions and separate groups replaying, commit after
processing with idempotent handlers, retention). General public knowledge for leaders, followers and
in-sync copies. All numbers are the lesson's own.

## Assumptions (model defaults)

2 million messages a second of 1 KB; a broker writing 500 MB a second; 0.5% of peak at launch; 24 brokers;
3 copies; 7 days kept; 400 partitions; a consumer handling 5,000 messages a second.

## What the numbers come to

2 GB/s in. One broker: 2% busy at launch, 400% at full size. Partitioned log on 24 brokers: 17% busy,
1.2 PB kept; with 3 copies: 50%, 3.6 PB. 400 consumers read 2,000,000 a second; 600 leave 200 idle; 200
fall behind by 1,000,000 a second.

## Steps

1 the ask · 2 one broker, read and delete · 3 one disk, one reader · 4 an append-only log in partitions ·
5 copies and a leader · 6 groups and offsets (Try it: consumers in one group) · 7 wrap-up.

## Engine changes in this PR

- `partitions` custom widget (with a test): four partitions filling over time, with each group's
  committed offset marked; the second group trails, replaying.
