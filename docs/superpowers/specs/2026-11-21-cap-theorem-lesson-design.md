# CAP theorem lesson ("When the network splits")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 19 of System Design, from *Vintelix System Design 101* Chapter 6: partitions aren't optional, so during one a store chooses between refusing on the minority side (CP) and answering from a copy that may be stale (AP); without a partition, consistency still costs a round trip per write (PACELC).

**Approach (my call).** A `cap` scene: users near site A → copies 1 and 2, users near site B → copy 3, with one vertical "network link" between the sites that shows "✕ cut" during the split. A panel spells out what each side does. CP: requests to copy 3 turn back red; AP: they come back amber (maybe stale).

**Model.** 30,000 requests a second, 10% writes, 30% of users near site B, 3 copies (majority 2). CP: 30% refused (9,000 a second). AP: 0 refused, 30% maybe stale, 3,000 × 30% × 60 s = 54,000 writes to merge after a 60 s split. Healthy: commit = flush + round trip: 2 ms in one region, 66 ms across regions; in flight = writes × commit time (6 against 198).

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | three-copies | Three copies, one network | majority 2 of 3, 2 ms |
| 2 | choose-consistency | The link fails: refuse to stay correct | 30% refused, 9,000 a second |
| 3 | choose-availability | Or answer, and risk old data | 30% maybe stale, 54,000 writes to merge |
| 4 | pacelc | Without a split, consistency costs time | 66 ms, 198 in flight; Try it: round trip |
| 5 | recap | What CAP taught us | points to consistency models |
