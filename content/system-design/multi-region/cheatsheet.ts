import type { Lesson } from "@tintelix/schema";

export const regionCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Active-passive vs active-active",
    text: ["Active-passive: one region serves, a replicated standby waits; simple, but writes stop until it's promoted ({writesDowntime} here). Active-active: every region serves and takes writes; no promotion, but concurrent writes need a conflict rule (last-writer-wins, or per-record home regions). A warm standby sits between the two."],
  },
  {
    heading: "Failover takes minutes",
    text: ["Noticing ({checks} failed checks {checkIntervalSec} apart = {detectSec}), promoting, then DNS: clients hold cached answers for the TTL ({dnsTtlSec}) and often longer, and open connections don't re-resolve until they break. A global load balancer or anycast avoids the DNS wait."],
  },
  {
    heading: "Replication lag",
    text: ["Cross-region copies are asynchronous: about half a round trip plus the apply batch ({lagMs} for Mumbai to Virginia). Reads in the other region can be stale for that long, and a region that dies takes its unsent writes with it (rate × lag)."],
  },
];
