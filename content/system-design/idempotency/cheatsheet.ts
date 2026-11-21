import type { Lesson } from "@tintelix/schema";

export const idemCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Why it happens",
    text: ["A timeout doesn't say whether the work happened. Clients retry and queues redeliver, so a non-idempotent call runs twice: {doubles} double charges a second in the example."],
  },
  {
    heading: "Idempotency keys",
    text: ["The client sends one unique key per operation with every attempt. The server stores key → result and returns the stored result for a repeat. Keep keys as long as retries can arrive: {keysStored} keys ({keyGb} GB) for {keyTtlHours} hours here."],
  },
  {
    heading: "The race",
    text: ["Check-then-insert lets two simultaneous requests through. Claim the key atomically first (unique constraint, INSERT … ON CONFLICT, SETNX), then do the work and save the result."],
  },
];
