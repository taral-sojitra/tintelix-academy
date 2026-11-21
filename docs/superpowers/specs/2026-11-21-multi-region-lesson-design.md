# Multi-region lesson ("A whole region goes dark")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 30, the last of System Design. Active-passive keeps a replicated standby that has to be promoted before writes resume; active-active serves from every region, so there's nothing to promote, but concurrent writes need a conflict rule. Failover takes minutes: noticing, promoting, DNS catching up. Cross-region replication is asynchronous, so the other region is always a little behind, and a region that dies takes its unsent writes with it.

**Approach (my call).** A `region` scene: users in India and the USA at the top, Global routing between them, and a region under each (Mumbai, Virginia) with app servers above a database. The databases are joined by a slowed "13,000 km" link carrying violet copies. A panel along the bottom shows replication in words, or a failover timeline: notice, promote, then DNS catching up, with a playhead. The chart stays hidden because the panel sits where it would be. Timelines run on a scene clock that resets on every step and input change.

**Model** (book §97.2, §97.3, §97.6). Mumbai and N. Virginia are 193 ms apart (the measured round trip, as in the CDN lesson); a region in your own city is 10 ms away. Lag = 193 ÷ 2 + a 75 ms apply batch = 172 ms. Failover: 3 failed checks 10 s apart = 30 s to notice, 60 s to promote (my assumption, stated in the step note), and a 60 s DNS TTL, with users moving evenly over the TTL. Active-passive: writes stop for 90 s and everyone has moved after 2.5 min; 2,000 writes a second × 172 ms = 343 lost. Active-active: US users see 0 s down, Indian users move after 30 s + TTL = 90 s, and 172 writes are lost. Failover steps run 10× fast; the lag step runs 10× slow.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | active-passive | One region serves, one stands by | US 193 ms, standby 172 ms behind, serves 0% |
| 2 | passive-failover | Mumbai goes dark | writes stop 90 s, everyone moved 2.5 min, 343 lost; Try it: DNS TTL |
| 3 | active-active | Both regions serve | US 10 ms, 1,000 writes a second each |
| 4 | active-failover | Mumbai goes dark again | US 0 s, India 90 s, 172 lost |
| 5 | lag | Replication lag crosses the ocean | Virginia reads v1 until v2 lands after 172 ms |
| 6 | recap | What multi-region taught us | end of System Design |

**Honesty.** Every number on screen comes from the model. The timeline speeds (10× fast for failover, 10× slow for lag) are in the live tag and the step notes. The promotion time is labelled as an assumption. DNS stragglers who hold answers past the TTL are mentioned in the cheatsheet, not modelled.
