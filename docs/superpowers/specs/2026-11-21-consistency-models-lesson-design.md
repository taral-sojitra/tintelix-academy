# Consistency models lesson ("How current is this read?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 20 of System Design, from *Vintelix System Design 101* Chapters 44 and 47: one timeline of writes and reads replayed under eventual, read-your-writes, causal and strong consistency, so the learner sees what each guarantee rules out and what it costs.

**Approach (my call).** A `timeline` scene with no packet traffic: one large panel with three lanes (leaders, replica 1 near Asha, replica 2 near Ben), 0–400 ms. Asha's post and Chen's reply travel to the replicas as lines; a playhead sweeps the timeline and each read is marked green or red as it passes. Under causal consistency the reply waits at replica 2 (a dashed segment) until the post arrives; under read-your-writes and strong, the reads move to the leaders' lane.

**Model.** Post reaches replica 1 at 100 ms and replica 2 at 300 ms. Asha reads at 50 ms; Chen replies at 150 ms, and the reply reaches replica 2 at 170 ms (replies live on a shard near Ben). Ben reads at 200 ms. Eventual: Asha misses her post, Ben sees a reply to nothing. Read-your-writes: Asha fixed, Ben not. Causal: reply held until 300 ms, so Ben sees neither. Strong: both see everything; Ben's read takes 70 ms instead of 1 ms. Copies agree after 300 ms.

| # | id | Title | What changes |
|---|---|---|---|
| 1 | eventual | Eventual: copies agree, eventually | Asha misses her post; Ben sees a reply to nothing |
| 2 | read-your-writes | Read your writes: Asha sees her post | Asha fixed |
| 3 | causal | Causal: no reply before its post | reply held to 300 ms |
| 4 | strong | Strong: one copy, as far as anyone can tell | 70 ms reads; Try it: round trip |
| 5 | recap | What consistency models taught us | points to distributed transactions |

**Rulings.** Ben's outcome is described in words in the step text (it is a state, not a number); the tiles show it from the model.
