import type { Lesson } from "@tintelix/schema";

export const leaderboardCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{playersM} million players: {updatesPeak} updates and {readsPeak} rank checks a second at peak. A SQL rank counts about {halfM} million rows: {rankMs} each."],
  },
  {
    heading: "Sorted set",
    text: ["Scores in an in-memory sorted set: update and rank in about {logSteps} steps (O(log n)), top 100 as one range, {memGb} GB. Write the database first, then the set; rebuild the set from the database after a restart."],
  },
  {
    heading: "Details and scale",
    text: ["Fold time into the score to break ties. Neighbours: rank, then a range around it. Separate boards per game, region and season; split a huge board by score range ({boardShards} shards at {playersM} million)."],
  },
];
