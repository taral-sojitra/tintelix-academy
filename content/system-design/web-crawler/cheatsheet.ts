import type { Lesson } from "@tintelix/schema";

export const crawlerCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{pagesB} billion pages a month is {pageRate} a second; at 500 ms a fetch, {fetchers} in flight; {storageTb} TB a month at 80 KB a page, less {dedupSavedTb} TB of duplicate content."],
  },
  {
    heading: "Politeness",
    text: ["A URL frontier: one queue per site, released no faster than its delay (robots.txt may set it). Fetchers take whichever site is ready; at one request a second per site, about {hostsInParallel} sites are crawled at once."],
  },
  {
    heading: "No repeats, no traps",
    text: ["A Bloom filter of seen URLs ({bloomGb} GB vs {setGb} GB exact) drops the {seenPct} of links already known; content fingerprints catch mirrors. Per-site page budgets and URL length and depth caps stop crawler traps. Cache DNS and robots.txt; back off from failing sites."],
  },
];
