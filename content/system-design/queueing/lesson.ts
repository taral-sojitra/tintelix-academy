import type { Lesson } from "@tintelix/schema";
import { queueCheatsheet } from "./cheatsheet";
import { queueModel } from "./model";
import { queueScene } from "./scene";
import { queueSteps } from "./steps";

export const queueing: Lesson = {
  id: "queueing",
  home: "system-design",
  slug: "queueing",
  topic: "Queueing and utilization",
  title: "Busy, then suddenly slow",
  promise: "See why waiting grows much faster than load, and count what is inside with Little's law.",
  minutes: 7,
  level: 1,
  scene: queueScene,
  model: queueModel,
  controls: {
    traffic: {
      label: "Traffic",
      min: 10,
      max: 99,
      step: 1,
      unit: "/s",
      readout: "At **{traffic}** a second the worker is **{utilPct}** busy: a request waits **{waitMs}** in line and takes **{responseMs}** in all, **{slowdown}×** its own work.",
    },
    workers: {
      label: "Workers",
      min: 1,
      max: 4,
      step: 1,
      readout: "With **{workers}** workers on one line, each is **{utilPct}** busy and a request takes **{responseMs}**.",
    },
  },
  steps: queueSteps,
  components: ["users", "app-server"],
  buildsOn: ["latency-percentiles"],
  questions: [],
  cheatsheetInputs: { traffic: 90 },
  cheatsheet: queueCheatsheet,
};
