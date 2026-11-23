import type { Lesson } from "@tintelix/schema";

export const exchangeCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{ordersM} million orders a day, {peakRate} a second at the open. A database match: {dbMatchMs} each, {dbCap} a second. In memory: {matchUs} µs; the busiest stock's thread {hotBusyPct} busy."],
  },
  {
    heading: "Matching",
    text: ["One order book per stock in memory: asks lowest first, bids highest first, each price a first-in queue. One thread per stock: no locks. Match until prices stop crossing."],
  },
  {
    heading: "Sequence and data",
    text: ["A sequencer numbers each order and journals it before matching ({journalGb} GB a day); a standby replays the journal. Market data ({feedRate} messages a second) goes out by multicast once, not {unicastM} million times."],
  },
];
