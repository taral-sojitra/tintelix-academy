import type { Lesson } from "@tintelix/schema";
import { dataCheatsheet } from "./cheatsheet";
import { dataModel } from "./model";
import { dataScene } from "./scene";
import { dataSteps } from "./steps";

export const sqlVsNosql: Lesson = {
  id: "sql-vs-nosql",
  home: "system-design",
  slug: "sql-vs-nosql",
  topic: "SQL vs NoSQL",
  title: "Tables or documents?",
  promise: "Store the same orders as joined tables and as documents, and see which questions and changes each makes cheap.",
  minutes: 7,
  level: 1,
  scene: dataScene,
  model: dataModel,
  controls: {
    listings: {
      label: "Seller's listings",
      min: 1000,
      max: 100000,
      step: 1000,
      readout: "Renaming a seller with **{listings}** listings rewrites **{renameDocs}** documents, taking **{renameSec}**; in tables, **{sqlRenameRows}** row.",
    },
  },
  steps: dataSteps,
  components: ["app-server", "database"],
  buildsOn: [],
  questions: [],
  cheatsheet: dataCheatsheet,
};
