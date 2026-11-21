# Bloom filters lesson ("Definitely not here")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 17 of System Design, from *Vintelix System Design 101* Chapter 59: a Bloom filter in front of the disk turns away lookups for keys that don't exist. "Definitely not" is exact and "maybe" is sometimes wrong. About 10 bits a key gives about 1%; a filter outgrown by its data says maybe far more often; a maybe must never authorise something irreversible on its own.

**Approach (my call).** A `bloom` scene: API → (filter, from step 2) → database. The filter is drawn as a toy 64-bit array with 3 hashes, labelled as a stand-in for the real one. Each lookup lights its bits: a red cell (a 0) means "definitely not here" and the request turns back red; all 1s means "maybe" and it goes to the disk (green if found, amber if it was a false positive).

**Model.** False positives = (1 − e^(−k·n/m))^k with k = round(bits per key × ln 2), sized for 100 M keys. 10 bits, 7 hashes: 0.82%; 20 bits: 0.01%. 10,000 lookups, 80% for missing keys: disk reads 10,000 → 2,066 (79% fewer); 125 MB of filter against 2,000 MB of keys. At 200 M keys in the same filter (5 bits a key): 14%, 3,102 reads.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | misses-hit-disk | Every miss still reads the disk | 10,000 reads, 8,000 wasted |
| 2 | bit-array | A bit array that can say no | mechanics on the toy array |
| 3 | sizing | Most misses never touch the disk | 0.82%, 2,066 reads, 125 MB; Try it: bits per key |
| 4 | outgrown | A filter that stopped growing | 5 bits a key, 14%, 3,102 reads; Try it: keys |
| 5 | recap | What Bloom filters taught us | points to object storage |

**Rulings.** The toy array holds more keys as the real filter fills past its design, so the picture gets denser in step 4. The share of lookups for missing keys (80%) is this lesson's own example.
