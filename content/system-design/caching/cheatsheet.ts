import type { Lesson } from "@tintelix/schema";

export const cachingCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "When to cache",
    text: [
      "Reads far outnumber writes, and the same answers are asked for again and again: product pages, profiles, settings.",
      "A slightly stale answer is fine for a short time.",
    ],
  },
  {
    heading: "Cache-aside in four steps",
    text: [
      "**1.** The app asks the cache.",
      "**2.** On a hit, it returns the cached answer.",
      "**3.** On a miss, it reads the database.",
      "**4.** It stores the answer in the cache with a TTL, then replies.",
    ],
  },
  {
    heading: "The numbers",
    text: [
      "DB reads = (1 − hit rate) × total reads.",
      "At {traffic} reads a second and a {hitRatePct} hit rate, the database serves {dbReads} a second and is {dbBusyPct} busy.",
      "The slowest 5% of reads take about {p95}.",
    ],
  },
  {
    heading: "Expiry storms",
    text: [
      "Keys written together with the same TTL expire together, and every read misses at once.",
      "Give keys random TTLs (60 minutes ± 10%), and let one request rebuild a hot key while the others wait.",
    ],
  },
];
