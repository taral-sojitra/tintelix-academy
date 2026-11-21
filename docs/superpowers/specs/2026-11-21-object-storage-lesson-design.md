# Object storage lesson ("Let uploads skip your servers")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 18 of System Design, from *Vintelix System Design 101* §30.4: relaying uploads ties up app servers for the whole slow transfer; a short-lived signed URL lets the phone upload straight to object storage; a big file sent in parts loses only one part when the connection drops.

**Approach (my call).** An `upload` scene: phones → app servers (a grid of 20 server cells, lit by servers needed) → object storage, or phones → storage directly after fetching a signed URL (cyan ask, violet URL, amber bytes). In the big-file steps the storage box shows the video as 20 parts filling over 10 s: one request drops at 90% and starts over; multipart marks the failed part red and sends only that again.

**Model.** 200 uploads a second of 5 MB on a 5 Mbit/s link: 8 s each, 1,600 busy workers (Little's law), 16 servers of 100 workers, 8 Gbit/s through the app. Signed URL: 5 ms of signing, 1 worker, 1 server, 0 through the app. A 2,000 MB video takes 53 min; a drop at 90% redoes 1,800 MB (48 min); 100 MB parts redo 100 MB (3 min).

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | through-app | Uploads tie up the app servers | 1,600 workers, 16 servers, 8 Gbit/s |
| 2 | signed-url | Hand out a signed URL | 1 worker, 1 server, 0 Gbit/s through the app |
| 3 | one-request | A big upload drops at 90% | 1,800 MB, 48 min sent again |
| 4 | multipart | Multipart: retry just one part | 100 MB, 3 min; Try it: part size |
| 5 | recap | What object storage taught us | points to CAP theorem |
