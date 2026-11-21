import type { Lesson } from "@tintelix/schema";

export const capCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "CAP, stated carefully",
    text: ["During a network partition, a distributed store can't give both linearizable consistency and an answer from every working node. Partitions aren't a choice, so the real choice is CP or AP during one."],
  },
  {
    heading: "CP and AP in practice",
    text: [
      "CP: only the majority side answers; the minority refuses ({errorPct} of requests in the split example). AP: everyone answers, some from stale copies, and both sides' writes must be merged afterwards.",
    ],
  },
  {
    heading: "PACELC",
    text: ["Else (no partition), choose latency or consistency: a majority write waits a round trip, about {commitMs} in one region and roughly thirty times that across regions."],
  },
];
