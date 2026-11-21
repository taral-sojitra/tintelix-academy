import type { Lesson } from "@tintelix/schema";

export const txnCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The problem",
    text: ["One business action spans several services, each with its own database. Without coordination, a failure partway leaves it half done."],
  },
  {
    heading: "Two-phase commit",
    text: ["Prepare (lock and vote), then commit or abort everywhere. Atomic, but locks last from prepare to commit ({lockMs} against {workMs} here), and a coordinator crash after prepare leaves participants blocked."],
  },
  {
    heading: "Sagas",
    text: ["A sequence of local transactions, each with a compensating action. On failure, compensate the completed steps in reverse. No cross-service locks, but no isolation: others can see in-between states. Orchestrated (one coordinator) or choreographed (events)."],
  },
];
