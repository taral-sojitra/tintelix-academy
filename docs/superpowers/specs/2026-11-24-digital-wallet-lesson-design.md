# Lesson 58: Design a digital wallet — design note

**Hook title:** Move money between wallets safely. **Scene kind:** `board`. **Builds on:** sharding (15),
distributed transactions (21), payment system (57). **Sources:** general public knowledge (one transaction
per transfer on one database, sharding by wallet, reserve-credit-settle sagas across shards, event
sourcing with snapshots and replay, transfer IDs for exactly-once, read views built from the log, balance
audits). All numbers are the lesson's own and deliberately differ from the well-known textbook example.

## Assumptions (model defaults)

300 million wallets; 50,000 transfers a second at peak, a third of that on average; 0.5% of peak at launch;
one database taking 5,000 transfers a second; 20 shards of 10,000 balance updates a second; two events of
about 200 bytes per transfer.

## What the numbers come to

One database: 250 transfers a second at launch (5%), 1,000% at peak. 20 shards: 50% each (40: 25%); 95%
of transfers cross shards. 2.9 billion events and 576 GB of log a day.

## Steps

1 the ask · 2 one database, one transaction · 3 one machine can't move it all · 4 shard by wallet, transfer
as a saga (Try it: shards) · 5 keep the events, derive the balance · 6 exactly once, reads, audit ·
7 wrap-up.

## Engine changes in this PR

- `eventlog` custom widget (with a test): one wallet's events appearing in order, with the balance
  replayed from them.
