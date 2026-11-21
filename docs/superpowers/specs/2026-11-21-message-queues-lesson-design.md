# Message queues lesson ("Absorb the spike")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 22 of System Design, from *Vintelix System Design 101* Chapter 29 and §64.6: a queue turns a spike the workers can't handle into a delay they can; poison jobs retried without limit eat the workers; a dead-letter queue caps that waste and keeps the bad jobs for a person.

**Approach (my call).** An `mq` scene: shop → (queue, from step 2) → workers → (dead-letter queue, step 4). The story plays over time at 4× speed (labelled): a 30 s flash sale from 2 s in. The stage sends more jobs during the spike, in proportion to the real arrival rate. In the queue steps only the share the workers can take now goes on; the rest joins the backlog bar. Poison jobs (purple, shown more often than the real 1 in 100) bounce back to the queue, or after three tries go to the dead letters.

**Model.** 200 jobs a second normally, 2,000 during the spike; 4 workers × 125 = 500 a second. Direct: 75% fail during the spike, 45,000 in all. Queue: 0 lost; backlog peaks at 1,500 × 30 = 45,000; longest wait 45,000 ÷ 500 = 90 s; drained 45,000 ÷ 300 = 150 s (shown as 3 min) after. Poison 1% = 2 a second: endless retries use 2 × 120 ÷ 500 = 48% of the workers after 120 s; with 3 tries then dead-letter, 2 × 3 ÷ 500 = 1.2%, and 240 jobs wait in the dead letters after 120 s.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | direct | A spike overwhelms the workers | 75% failing, 45,000 lost |
| 2 | queue | Put a queue in between | 0 lost, 45,000 peak, 90 s wait, 3 min to drain; Try it: workers |
| 3 | poison | A poison job comes back forever | 48% of workers after 120 s |
| 4 | dead-letters | Dead-letter after a few tries | 1.2%, 240 parked |
| 5 | recap | What queues taught us | points to idempotency |

**Rulings.** The poison steps turn the spike off so the picture shows only the retry effect. The visual poison share is higher than the real one, and the note says so.
