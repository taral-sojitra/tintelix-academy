import type { Lesson } from "@tintelix/schema";

export const consistencyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "From weakest to strongest",
    text: [
      "Eventual: replicas converge once writes stop ({convergeMs} in the example). Read-your-writes: a session sees its own writes. Monotonic reads: never go back in time. Causal: dependent writes appear in order. Linearizable: every read sees the latest write.",
    ],
  },
  {
    heading: "What they cost",
    text: ["Stronger guarantees mean routing reads to the leader, holding writes until dependencies arrive, or waiting for a quorum. A linearizable read from far away took {readMs} against {localMs} locally."],
  },
  {
    heading: "Choosing",
    text: ["Per feature, not per system: counters and feeds can be eventual, a user's own edits need read-your-writes, comment threads want causal, money and locks need strong."],
  },
];
