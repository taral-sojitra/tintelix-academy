import type { Lesson } from "@tintelix/schema";

export const methodCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The seven steps",
    text: ["1 requirements (what it does, how well, in numbers) · 2 estimates (rates, storage) · 3 API · 4 data · 5 a simple design · 6 a deep dive on the part that breaks · 7 bottlenecks and single points of failure. Each answer feeds the next step."],
  },
  {
    heading: "The 45 minutes",
    text: ["About 5 minutes each for steps 1 to 4, 10 for the design, 10 for the deep dive, 5 for weak spots. Say assumptions out loud, write the arithmetic down, and spend the deep dive where the numbers point."],
  },
  {
    heading: "This example",
    text: ["{votesM} million votes in 5 minutes: {avgVoteRate} a second on average, {peakVoteRate} at peak, {storageGb} GB in all. A queue accepts the burst at once; batches of {batchSize} bring database writes down to {dbWriteRate} a second ({dbBusyPct} busy). A standby database closes the last single point of failure."],
  },
];
