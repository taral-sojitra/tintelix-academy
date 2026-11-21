# Fan-out lesson ("A celebrity posts")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 25 of System Design: fan-out on write makes feed reads cheap but turns a celebrity's post into millions of writes; fan-out on read makes writes cheap but every feed open expensive; big feeds push for most accounts and pull for celebrities.

**Approach (my call).** A `fanout` scene: a normal author and a celebrity → fan-out workers (with a write-load meter) → followers' feeds drawn as 48 cells. Pushed posts flow left to right. In the celebrity step the feeds fill amber over the delivery time. In pull mode, feed opens travel back to the authors (purple) and return green, and the cells are dashed ("built when opened"). In hybrid, celebrity activity is fetched at read time and the cells carry a purple dot.

**Model.** 5,000 posts a second × 300 followers = 1,500,000 feed writes a second, 75% of a 2,000,000 capacity. A 10,000,000-follower post gets the 500,000 spare: 20 s to reach the last follower. Pull: 20,000 opens a second × 200 accounts followed = 4,000,000 lookups a second. Hybrid: 1 + 5 celebrities = 6 lookups per open, 120,000 a second, celebrity posts visible at once.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | push | Copy each post into every feed | 1,500,000 writes a second, 1 read per open |
| 2 | celebrity | A celebrity posts | 20 s to deliver |
| 3 | pull | Or build the feed when it's opened | 200 per open, 4,000,000 a second |
| 4 | hybrid | Push most posts, pull celebrities | 6 per open, 120,000 a second |
| 5 | recap | What fan-out taught us | points to API gateway |
