import type { Lesson } from "@tintelix/schema";

export const fanoutCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Fan-out on write (push)",
    text: ["Copy each post into each follower's feed: writes = posts × followers ({feedWrites} a second), reads = one per open. A celebrity post is one write per follower: {celebFollowers} of them."],
  },
  {
    heading: "Fan-out on read (pull)",
    text: ["Store posts once; at each open, fetch from every followed account and merge: {follows} lookups per open in the example, so read-heavy apps pay dearly."],
  },
  {
    heading: "Hybrid",
    text: ["Push for normal accounts, pull for accounts over a follower threshold. An open reads its ready-made feed plus the few celebrities followed ({perOpen} lookups)."],
  },
];
