import type { Lesson } from "@tintelix/schema";
import { searchCheatsheet } from "./cheatsheet";
import { searchModel } from "./model";
import { searchScene } from "./scene";
import { searchSteps } from "./steps";

export const searchEngine: Lesson = {
  id: "search-engine",
  home: "system-design",
  slug: "search-engine",
  topic: "Design a search engine",
  title: "Find it among a billion pages",
  promise: "Watch a full scan take minutes, then build an inverted index over two billion documents, say how long indexing takes, and keep a trending query from swamping it.",
  minutes: 9,
  level: 2,
  scene: searchScene,
  model: searchModel,
  controls: {
    refreshSec: {
      label: "Refresh interval",
      min: 1,
      max: 30,
      step: 1,
      unit: "s",
      readout: "Searchable after about **{lagSec}**; **{segmentsPerMin}** new segments a minute across all shards.",
    },
  },
  steps: searchSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["indexing", "sharding", "web-crawler"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: searchCheatsheet,
};
