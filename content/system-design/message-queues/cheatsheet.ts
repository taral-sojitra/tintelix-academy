import type { Lesson } from "@tintelix/schema";

export const mqCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Load levelling",
    text: ["A spike of {spikeRps} a second for {spikeSec} against {capacity} of capacity: direct calls lose {failedTotal} jobs; a queue keeps them all, with a peak backlog of excess × duration and a wait of backlog ÷ capacity."],
  },
  {
    heading: "Draining",
    text: ["After the spike, the backlog drains at capacity − normal traffic: {drainSec} here. If normal traffic is above capacity, the backlog never drains: add workers."],
  },
  {
    heading: "Retries and dead letters",
    text: ["Retry with backoff a limited number of times, then move the job to a dead-letter queue and alert on it. Delivery is usually at least once, so jobs must be safe to run twice."],
  },
];
