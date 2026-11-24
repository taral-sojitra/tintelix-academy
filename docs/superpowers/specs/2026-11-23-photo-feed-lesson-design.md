# Lesson 40: Design a photo feed (news feed) — design note

**Hook title:** Fill the home feed in a blink. **Scene kind:** `board`. **Builds on:** caching (10),
object storage (18), fan-out (25). **Source:** Vintelix System Design 101, Chapter 129 (requirements,
capacity, presigned uploads and cursor paging, fan-out on write vs on read, the celebrity problem with an
80-million-follower account at 200,000 writes a second, the hybrid threshold, the viral-post hot key),
paraphrased.

## Numbers

Chapter 129's: 500 million people a day × 5 feed loads = 28,935 a second; 0.5% post = 29 a second
(1,000:1); 80% photos at 5 MB, 20% video at 25 MB = 22.5 TB a day, 8.2 PB a year; one 80-million-follower
post at 200,000 writes a second = 400 s (shown as 7 min). The lesson's own: peak 2×; 200 accounts
followed; a posts store answering a million lookups a second; 300 followers on an ordinary account; 1% of
peak at launch; a pull threshold of a million followers; 3 big accounts followed.

## What the numbers come to

Pull at launch: 115,741 lookups a second, 12% busy; at scale 11.6 million, 1,157% busy, 91% too slow.
Push: one lookup per load, 8,681 fan-out writes a second (4.3% of the tier). Celebrity: 7 min a post (a
million followers: 5 s). Hybrid: at most 5 s a post; 173,611 merge lookups a second, 17% busy.

## Steps

1 the ask · 2 pull at launch · 3 pull at scale · 4 fan-out on write · 5 one post, eighty million writes
(Try it: followers) · 6 the hybrid; viral posts · 7 wrap-up.

## Calls I made

- No new widget: the spec's "reuses fan-out" is met by the board's own fan-out flows, rather than reusing
  lesson 25's scene.
