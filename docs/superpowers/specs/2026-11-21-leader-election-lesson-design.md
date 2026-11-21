# Leader election lesson ("Who's in charge now?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 29 of System Design: one leader orders the writes and sends heartbeats; when they stop for the election timeout, a follower raises the term and needs a majority of votes; only a majority can elect, so a split leaves at most one working side; and a deposed leader can still wake up and write, so the place it writes to checks a fencing token.

**Approach (my call).** A `leader` scene: five servers (n1–n5) on an ellipse, every pair wired with straight lines, a Votes panel (one dot per server and a line of text), and Storage that joins in step 4. Heartbeats are green, vote requests amber, votes violet, writes cyan, the rejected write red. Followers show amber timer bars while they wait. Step 3 draws a dashed "network split" line and turns the six crossing wires red. A scene clock drives every timeline and resets on each step and input change; states come from the unsmoothed model output.

**Engine change (my call).** Wires can be marked `straight: true`. The usual S-curve (level tangents) tangles a pentagon; a straight wire puts the curve's control points on the line. Added to the scene schema, `makeWire`, the player and wire labels, with a geometry test. Existing wires are unchanged.

**Model** (book §6.3, §77.5, §78.3–78.5). Five servers, majority 3, can lose 2. etcd's defaults: 100 ms heartbeat (40 messages a second to 4 followers) and a 1,000 ms election timeout. Failover = timeout + a 10 ms vote round trip = 1,010 ms, so 2,020 writes wait at 2,000 a second. Needless elections a day = 200 blips × e^(−timeout ÷ 250 ms) = 4 at 1,000 ms, 60 at 300 ms (the blip numbers are this lesson's assumption, stated in the readout). Terms 33 → 34, used as fencing tokens; n1 freezes for 5 s.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | one-leader | One leader, and a heartbeat | 3 of 5, can lose 2, 40/s |
| 2 | election | The leader dies: an election | 1,010 ms, 2,020 writes wait, 4 needless elections a day; Try it: election timeout |
| 3 | partition | Split in two, only the majority leads | 3 of 5 elect n2 in term 34; n1's 2 of 5 commit 0% |
| 4 | fencing | A fencing token stops a stale write | storage has 34, refuses n1's 33 |
| 5 | recap | What leader election taught us | points to multi-region |

**Honesty.** Every number on screen comes from the model. Waits run at real speed; the vote, about 10 ms, is held on screen for 1.5 s, which step 2's note says. Packets are a sample (5 a second). In step 2 every follower's term turns to 34 when the vote starts, a slight simplification of "on receiving the request".
