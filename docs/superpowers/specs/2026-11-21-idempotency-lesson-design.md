# Idempotency lesson ("Charged twice?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 23 of System Design: a lost reply makes the client retry, and a plain retry charges again; an idempotency key saved with the result makes the retry return the first result; check-then-insert still lets simultaneous duplicates race, so the key must be claimed atomically.

**Approach (my call).** An `idem` scene: phone → payments API → card network, with an idempotency-key store from step 2. A lost reply comes back red and the retry goes out amber. Without a key the network shows "charged twice!"; with one, the key store answers "seen this key: saved result". Duplicates race past a check-then-insert store, and are refused with "already in progress" once the key is claimed atomically. Lost replies and double taps are drawn far more often than they happen (the first step's note says so).

**Model.** 1,000 payments a second; 1% time out (10 retries a second); half of those were already charged, giving 5 doubles a second. 0.1% double taps add 1 a second: 6 a second, 518,400 a day. Key (check then insert): 0 from retries, 1 a second from races; keys kept 24 h is 86,400,000 keys, about 17 GB at 200 bytes. Atomic claim: 0.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | double-charge | A timeout, a retry, a second charge | 6 a second, 518,400 a day |
| 2 | idempotency-key | Send an idempotency key | 0 from retries; 86,400,000 keys, 17 GB |
| 3 | race | Two requests check at once | 1 a second still |
| 4 | atomic-claim | Claim the key first | 0 |
| 5 | recap | What idempotency taught us | points to rate limiting |
