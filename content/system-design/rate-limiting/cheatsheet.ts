import type { Lesson } from "@tintelix/schema";

export const limitCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Token bucket",
    text: ["Refill at r tokens a second, hold at most b. A request spends a token or gets 429. Steady rate r ({limit} here), bursts up to b ({bucket}); an empty bucket refills in b ÷ r ({refillSec})."],
  },
  {
    heading: "Other algorithms",
    text: ["Fixed window: simple, but bursty at window edges. Sliding window log or counter: smoother. Leaky bucket: a steady output rate, queueing bursts instead of passing them."],
  },
  {
    heading: "In a fleet",
    text: ["Per-server counters multiply the limit by the number of servers ({flooderAllowed} instead of {limit} a second in the example). Keep counts in a shared store with atomic updates, or accept looser limits."],
  },
];
