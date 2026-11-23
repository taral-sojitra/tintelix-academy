# Lesson 52: Design ad click aggregation — design note

**Hook title:** Count every click exactly once. **Scene kind:** `board`. **Builds on:** message queues (22),
idempotency (23), distributed message queue (50). **Sources:** Vintelix System Design 101, Chapters 68 and
140 (paraphrased: event time against arrival time, tumbling windows closed by a watermark trailing the
latest event by a slack, late data silently dropped by default, exact counts for billing and approximate
ones for dashboards). All numbers are the lesson's own and deliberately differ from the well-known
textbook example.

## Assumptions (model defaults)

8 billion clicks a day, 3× at peak; 5 million ads, 600,000 clicked in a minute; a database taking 50,000
writes a second; 1% of peak at launch; 0.5% of clicks retried; 2% from phones that were offline (delays
averaging 2 minutes), the rest about 2 s; a 30 s watermark slack.

## What the numbers come to

92,593 clicks a second, 277,778 at peak. A counter per click: 5.6% busy at launch, 556% at peak; 40
million clicks a day counted twice. One row per ad per minute: 10,000 a second, 20% busy. 1.6% of clicks
arrive after a 30 s watermark (125 million a day); 120 s: 0.74%; 5 s: 10%.

## Steps

1 the ask · 2 add one to the ad's counter · 3 too many writes, and some counted twice · 4 log first,
count in memory · 5 when is a minute finished? (Try it: watermark slack) · 6 exactly once, on purpose ·
7 wrap-up.

## Engine changes in this PR

- `watermark` custom widget (with a test): three minutes of clicks by click time, one-minute windows that
  close when the watermark passes, and an offline phone's click that arrives too late (or doesn't, with
  more slack).
