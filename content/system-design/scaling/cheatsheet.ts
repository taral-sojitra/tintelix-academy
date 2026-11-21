import type { Lesson } from "@tintelix/schema";

export const scalingCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Scale up",
    text: ["One bigger machine: no code changes, but a ceiling ({maxCores} cores here, {maxVerticalCapacity} a second) and a single point of failure."],
  },
  {
    heading: "Scale out",
    text: ["Many machines behind a load balancer: no ceiling, and one failure costs only a slice. The work must split: stateless app servers do; a single primary database doesn't."],
  },
  {
    heading: "Amdahl's law",
    text: ["Speedup(N) = 1 ÷ ((1 − p) + p ÷ N), where p is the share of work that runs in parallel. A serial share s caps speedup at 1 ÷ s: 5% serial caps it at 20×, however many servers you buy."],
  },
  {
    heading: "The Universal Scalability Law",
    text: [
      "C(N) = N ÷ (1 + σ(N − 1) + κN(N − 1)): σ is contention, κ is crosstalk between pairs of servers.",
      "With crosstalk, throughput peaks at N = √((1 − σ) ÷ κ) and then falls. Measure σ and κ with a load test at two sizes.",
    ],
  },
];
