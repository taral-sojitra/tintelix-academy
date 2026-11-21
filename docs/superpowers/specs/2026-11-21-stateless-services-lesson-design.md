# Stateless services lesson ("Where does my login live?")

Status: built on Taral's standing go-ahead · 2026-11-21

**Intent.** Lesson 9 of System Design, from *Vintelix System Design 101* Chapter 92: sessions held in one server's memory break round robin; sticky sessions hide the problem but unbalance the fleet and turn a deploy into a mass logout (§92.5's 5,000 users); a shared session store makes any server able to answer, for one network read per request (§92.7).

**Approach (my call).** A `session` scene: three groups of users (cyan, amber, violet requests) → balancer → three servers, each showing whose sessions it holds; step 4 adds a Redis session store that every request visits. The deploy step plays at a quarter speed so the two-second burst of logins is visible, and the chart shows the share sent to log in.

**Model.** Round robin finds the session one time in N (67% lost with 3 servers). Sticky: 0% lost; a deploy that replaces one server logs out its 5,000 users within 2 s (2,500 logins a second). While that burst lasts, one group in three bounces; the model takes the time since the deploy so the chart and tiles follow it. Shared store: 0 logged out; +1 ms per request (0.67% on 150 ms, 13% on 8 ms); store load = requests × (1 + refresh share) = 6,000 a second at 5,000 requests a second.

| # | id | Title | Key numbers |
|---|---|---|---|
| 1 | lost-login | Round robin loses your login | 5,000 sessions per server, 67% lost |
| 2 | sticky | Sticky sessions pin each user | 0% lost; uneven load |
| 3 | deploy | A routine deploy logs users out | 5,000 logged out, 2,500 logins a second |
| 4 | shared-store | Keep sessions in a shared store | 0 logged out, 151 ms (+0.67%), 6,000 store ops a second; Try it: request time |
| 5 | recap | What statelessness taught us | points to Caching |

**Also in this PR.** A fix to the "Try it" value label shared by every lesson: *Pct controls already hold a percentage (the label multiplied them by 100), and *Ms controls no longer repeat their unit.
