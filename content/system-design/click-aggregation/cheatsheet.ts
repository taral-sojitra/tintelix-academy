import type { Lesson } from "@tintelix/schema";

export const clicksCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{clicksB} billion clicks a day: {avgRate}/s, {peakRate}/s at peak. A counter update per click is {peakRate} writes a second; one row per ad per minute is {dbWrites}."],
  },
  {
    heading: "Windows and watermarks",
    text: ["Count by click time in one-minute windows. Watermark = latest click time − slack ({slackSec}); a window closes when the watermark passes its end. {latePct} of clicks still arrive later: route them to corrections, never drop silently."],
  },
  {
    heading: "Exactly once",
    text: ["Click IDs deduplicate retries ({dupsM} million a day otherwise). Save counts with log offsets together; restart from the save. Recount billing nightly from the raw log; approximate counts are for dashboards only."],
  },
];
