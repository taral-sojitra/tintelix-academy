# Lesson 39: Design a notification service — design note

**Hook title:** A million alerts, none sent twice. **Scene kind:** `board`. **Builds on:** message
queues (22), idempotency (23), rate limiting (24), retries and circuit breakers (28). **Source:**
Vintelix System Design 101, Chapter 138 (requirements, capacity, 202/409 API, per-channel fan-out,
atomic (event, user, channel) reservation before fan-out, per-channel failure handling, the partition
ceiling on audience resolution, the SMS gateway bottleneck), paraphrased.

## Numbers (chapter 138's)

350 million events a day = 4,051 a second (12,153 at 3× peak). A 15-million-user broadcast in 5 minutes:
10.5 million push (35,000/s), 3.75 million email (12,500/s), 750,000 SMS (2,500/s); an SMS gateway at
300/s takes 2,500 s (shown as 42 min) and sends 12% by the deadline. Dedup keys: 15 million × 80 B = 1.2
GB. Audience resolution: 32 partitions × 2,000/s = 64,000/s, about 4 min (16 partitions: about 8 min).

## The lesson's own model

One shared queue moves no faster than its slowest messages: gateway rate ÷ SMS share = 6,000 a second in
all, so push drains at 4,200/s and finishes with SMS at 42 min; workers pushing SMS at the needed rate see
88% refused. A queue per channel lets push and email finish in 5 min.

## Steps

1 the ask · 2 accept fast (202, 409), one queue, an ordinary day · 3 the broadcast: one slow channel holds
up the rest · 4 a queue per channel (Try it: SMS gateway rate) · 5 reserve each send before fan-out · 6 the
audience takes time too (Try it: partitions); per-channel failure handling · 7 wrap-up.

## Engine changes in this PR

- `lanes` custom widget (with a test): the broadcast playing out per channel (20 broadcast seconds per real
  second), each lane's progress and when it will finish.

## Calls I made

- The Try-it label reads "Gateway rate for SMS" because the Try-it header lowercases a label's first
  letter ("sMS").
