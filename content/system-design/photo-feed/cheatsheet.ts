import type { Lesson } from "@tintelix/schema";

export const feedCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{feedRate} feed loads a second ({feedPeak} at peak) against {postRate} posts: {readWriteRatio} to 1. Media: {mediaPbYear} PB a year to an object store and CDN, uploaded directly with presigned URLs."],
  },
  {
    heading: "Push or pull",
    text: ["Pull (fan-out on read): no write cost, but each load does a lookup per account followed. Push (fan-out on write): a feed load is one lookup, a post costs a write per follower ({fanWrites} a second here). Push wins for ordinary accounts."],
  },
  {
    heading: "The hybrid",
    text: ["Push for accounts under a threshold ({thresholdM} million followers: at most {maxFanSec} per post); pull and merge the few above it at read time ({mergeRate} lookups a second). Spread a viral post's reads across copies. Page feeds with a cursor."],
  },
];
