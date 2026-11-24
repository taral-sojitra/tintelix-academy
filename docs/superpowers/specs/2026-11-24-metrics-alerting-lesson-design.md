# Lesson 51: Design metrics monitoring and alerting — design note

**Hook title:** Spot the outage before users do. **Scene kind:** `board`. **Builds on:** latency
percentiles (1), availability (3), health checks (8). **Sources:** Vintelix System Design 101, Chapters 33
and 101 (paraphrased: metrics as running numbers that forget each event, series as combinations of label
values, 2,500 series from method × status × route, about 25 million from a user-ID path label, memory per
series). General public knowledge for compressed time-series storage, rollups and symptom-based alerts.
All other numbers are the lesson's own and deliberately differ from the well-known textbook example.

## Assumptions (model defaults)

60,000 servers × 200 series, every 15 s; 16 bytes a raw sample, about 1.5 compressed; one database taking
200,000 samples a second; 5% of servers at launch; 8 store nodes; raw 15 days, 1-minute rollups 90 days,
1-hour rollups 2 years at 6 bytes a point; 2 KB of memory a series.

## What the numbers come to

12 million series, 800,000 samples a second, 1.1 TB a day as rows. One database: 20% at launch, 400% at
full size. Sharded and compressed: 50% a node, 104 GB a day. Rollups: two years in 12 TB (76 TB raw); a
30-day graph reads 720 points, not 172,800. A user-ID label: 25,000,000 series, 50,000 MB.

## Steps

1 the ask · 2 a row for every sample · 3 too many tiny writes, too many points · 4 a store built for time
series · 5 roll up the old data (Try it: raw days) · 6 labels and alerts (Try it: user IDs in a label) ·
7 wrap-up.

## Engine changes in this PR

- `rollup` custom widget (with a test): one series as 24 bars, raw or with older bars averaged into
  1-minute and 1-hour points. Class prefix `.tx-rup` (`.tx-ru` would match `.tx-rules`).
