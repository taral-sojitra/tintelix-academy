import type { Lesson } from "@tintelix/schema";

export const suggestCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The load",
    text: ["{dailyUsersM} million people × 8 searches × about 6 requests per search: {suggestRate} requests a second, {suggestPeak} at peak, each due within about 100 ms."],
  },
  {
    heading: "The structure",
    text: ["A prefix query that sorts on every keystroke is too slow, worst for one-letter prefixes. A trie with the top five completions stored at every node turns each request into a short walk and a read: {trieGb} GB in memory for {distinctM} million queries, {trieServers} servers."],
  },
  {
    heading: "Keeping it fresh and cheap",
    text: ["Count from search logs in a weekly batch, build a new trie, swap it in; add an hourly pass for trends. Cache suggestions in the browser ({browserHitPct} of requests). Filter offensive completions. Shard by prefix range, balanced by counts."],
  },
];
