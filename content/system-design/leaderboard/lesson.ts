import type { Lesson } from "@tintelix/schema";
import { leaderboardCheatsheet } from "./cheatsheet";
import { leaderboardModel } from "./model";
import { leaderboardScene } from "./scene";
import { leaderboardSteps } from "./steps";

export const leaderboard: Lesson = {
  id: "leaderboard",
  home: "system-design",
  slug: "leaderboard",
  topic: "Design a real-time leaderboard",
  title: "Rank ten million players live",
  promise: "Show ten million players their rank the moment a match ends: keep scores in an in-memory sorted set so a rank is a lookup in O(log n), not a count, and split huge boards by score range.",
  minutes: 8,
  level: 2,
  scene: leaderboardScene,
  model: leaderboardModel,
  controls: {
    players: {
      label: "Players on one board",
      min: 1000000,
      max: 200000000,
      step: 1000000,
      readout: "**{boardShards}** shards, each **{boardBusyPct}** busy, {memGb} GB in all.",
    },
  },
  steps: leaderboardSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["caching", "sharding"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: leaderboardCheatsheet,
};
