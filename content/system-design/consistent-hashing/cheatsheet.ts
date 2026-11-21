import type { Lesson } from "@tintelix/schema";

export const ringCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Why mod N hurts",
    text: ["Going from N to N + 1 servers under hash(key) mod N moves N ÷ (N + 1) of the keys: {modMovedPct} going from {servers} to {newServers}, so most of a cache misses at once."],
  },
  {
    heading: "The ring",
    text: ["Hash servers and keys onto the same circle; a key belongs to the next server clockwise. A new server claims only the arc in front of it, about 1 ÷ (N + 1) of the keys ({ringMovedPct} on this ring)."],
  },
  {
    heading: "Virtual nodes",
    text: ["One point per server gives uneven arcs (largest {maxSharePct} against a fair {fairPct} with {vnodes} points each). Many points per server even out the shares, and a bigger server can take more points."],
  },
];
