# Rate limiting lesson ("One client floods the API")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 24 of System Design: one flooding client takes the API down for everyone; a token bucket per client caps the steady rate and answers 429 but still lets short bursts through; separate buckets on each server multiply the limit, so the count must be shared.

**Approach (my call).** A `limit` scene: normal users (cyan) and one flooding client (purple) → rate limiter → API with a load meter. Without a limit the API drops requests from everyone (red). With a bucket, the flooder's extra requests turn back amber with a 429 at the limiter, whose bar shows the flooder's empty bucket; in the burst step the bar is a page's bucket draining by the burst and refilling at the limit.

**Model.** API capacity 1,000 a second; 100 normal clients × 5 = 500 a second; the flooder sends 2,000. No limit: 2,500 asked for (250%), 40% served for everyone. Bucket at 10 a second, holding 50: flooder gets 10, 1,990 a second refused, normal users 100%. A 30-request page burst passes whole (a strict 10-a-second limit passes 10); the bucket refills in 5 s. Four servers with their own buckets: flooder gets 40 a second; a shared count gives 10.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | flood | One client floods the API | 250% asked, 40% served |
| 2 | token-bucket | A token bucket for each client | 10 a second, 1,990 refused, 100% served |
| 3 | bursts | Short bursts are allowed | 30 of 30 against 10; refills in 5 s; Try it: bucket size |
| 4 | shared-count | Four servers, four buckets | 40 a second against 10 shared |
| 5 | recap | What rate limiting taught us | points to fan-out |
