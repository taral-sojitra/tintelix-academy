# Replication lesson ("Copies that fall behind")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 14 of System Design, from *Vintelix System Design 101* Chapter 44 and §94.3: replicas spread reads but never writes; asynchronous lag makes a user's read-back stale; reading your own writes from the primary fixes it; a crashed primary loses its unreplicated writes and writes fail until a replica is promoted; synchronous replication loses none at the cost of a round trip per write.

**Approach (my call).** A `repl` scene: app → primary (amber writes) and → up to three replicas (cyan reads, violet read-backs), with dashed replication streams labelled with the lag. Failover plays in real seconds: the primary goes red, Replica 1 shows "being promoted…", then takes writes while the others carry the reads.

**Model.** Reads per replica = (reads − read-backs sent to the primary) ÷ replicas serving reads; busy = load ÷ 5,000 a second. Stale read-backs = lag ÷ read-back window (90 ms ÷ 200 ms = 45%, 450 a second). Lost writes = writes a second × lag (90). Writes fail until failover (10 s). Sync write = commit + round trip (2 + 60 = 62 ms, §44.3). A promoted replica leaves the read pool.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | read-replicas | Copies take the reads | 4,500 reads per replica (90% busy), 1,000 writes on the primary; Try it: replicas |
| 2 | stale-read | You save, then see the old value | 90 ms lag, 45% of read-backs stale; Try it: lag |
| 3 | read-your-writes | Read your own writes from the primary | 0% stale, primary 40% busy |
| 4 | failover | The primary dies with writes in flight | 90 writes lost, 10 s of failed writes; sync 62 ms against 2 ms |
| 5 | recap | What replication taught us | points to sharding |

**Rulings.** The read-back window and the visual request mix (14% writes, 14% read-backs) are this lesson's own example. Step 4 uses three replicas so two still share reads after the promotion.
