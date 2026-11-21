import type { Lesson } from "@tintelix/schema";
import { indexCheatsheet } from "./cheatsheet";
import { indexModel } from "./model";
import { indexScene } from "./scene";
import { indexSteps } from "./steps";

export const indexing: Lesson = {
  id: "indexing",
  home: "system-design",
  slug: "indexing",
  topic: "Indexing",
  title: "Stop reading every row",
  promise: "Watch a full table scan read every page, a B+ tree jump straight to the row, and every extra index tax your writes.",
  minutes: 7,
  level: 1,
  scene: indexScene,
  model: indexModel,
  controls: {
    rows: {
      label: "Table size",
      min: 1_000_000,
      max: 100_000_000,
      step: 1_000_000,
      unit: "rows",
      readout: "With **{rows}** rows, a scan reads **{scanPages}** pages ({scanSec}); the index reads **{indexPages}** ({indexMs}).",
    },
    secondary: {
      label: "Extra indexes",
      min: 0,
      max: 6,
      step: 1,
      readout: "With **{secondary}** extra indexes, each insert updates **{trees}** trees: **{insertRate}** inserts a second.",
    },
  },
  steps: indexSteps,
  components: ["app-server", "database"],
  buildsOn: ["sql-vs-nosql"],
  questions: [],
  cheatsheet: indexCheatsheet,
};
