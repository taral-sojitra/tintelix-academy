# Sharding lesson ("Too big for one database")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 15 of System Design, from *Vintelix System Design 101* Chapter 45: only sharding adds write capacity; range sharding on a growing key burns one shard; hashing evens keys but scatters range queries; a hot key still overloads one shard until it is salted into sub-keys.

**Approach (my call).** A `shard` scene: app → shard router → up to six shards drawn as compact rows (key range or hash bucket, busy meter, writes a second). Writes pick a shard in proportion to the model's load on it, so the picture always matches the numbers; an overloaded shard turns red and fails its excess.

**Model.** 20,000 writes a second; each machine takes 5,000. One primary: 400% busy, 25% stored. Range on order id: the last shard takes all 20,000. Hash over 5: 4,000 each (80%), but a range query asks 5 shards. Hot key with 30%: 6,000 ÷ split + 2,800 → 8,800 (176%) unsplit, 4,000 split five ways.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | one-primary | One primary can't take the writes | 400% busy, 25% stored, needs 4 |
| 2 | by-range | Split by range: the newest shard burns | 20,000 on the last shard; range query asks 1 |
| 3 | by-hash | Split by hash: even shards | 4,000 each, 80%, 100% stored; query asks 5; Try it: shards |
| 4 | hot-key | One hot key still burns one shard | 8,800, 176%; Try it: split hot key |
| 5 | recap | What sharding taught us | points to consistent hashing |
