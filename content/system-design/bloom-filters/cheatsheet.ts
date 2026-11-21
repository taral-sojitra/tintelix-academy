import type { Lesson } from "@tintelix/schema";

export const bloomCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "How it answers",
    text: ["m bits, k hashes. Insert sets k bits; a lookup with any 0 bit is definitely absent, all 1s is maybe. No false negatives, some false positives, no deletes (a counting variant can delete)."],
  },
  {
    heading: "Sizing",
    text: ["False positives ≈ (1 − e^(−k·n/m))^k, best with k ≈ 0.69 × bits per key. {bitsPerKey} bits a key with {hashes} hashes: {fpPct}. About 10 bits a key is about 1%; 20 is about 0.01%."],
  },
  {
    heading: "Where it fits",
    text: ["In front of a disk or database to skip lookups for missing keys (LSM-tree SSTables, cache penetration), or a blocklist. Never as the last word before something irreversible: a maybe needs a real check."],
  },
];
