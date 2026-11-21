import type { Lesson } from "@tintelix/schema";
import { methodCheatsheet } from "./cheatsheet";
import { methodModel } from "./model";
import { methodScene } from "./scene";
import { methodSteps } from "./steps";

export const designMethod: Lesson = {
  id: "design-method",
  home: "system-design",
  slug: "design-method",
  topic: "How to approach a design problem",
  title: "Forty-five minutes, one whiteboard",
  promise: "Walk the seven steps every design follows, from questions and numbers to the part that breaks, on the voting for a live TV show.",
  minutes: 8,
  level: 1,
  scene: methodScene,
  model: methodModel,
  controls: {
    batchSize: {
      label: "Batch size",
      min: 5,
      max: 500,
      step: 5,
      unit: "votes",
      readout: "**{dbWriteRate}** batch writes a second: the database is **{dbBusyPct}** busy.",
    },
  },
  steps: methodSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["estimation"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: methodCheatsheet,
};
