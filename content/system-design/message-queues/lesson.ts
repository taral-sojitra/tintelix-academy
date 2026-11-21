import type { Lesson } from "@tintelix/schema";
import { mqCheatsheet } from "./cheatsheet";
import { mqModel } from "./model";
import { mqScene } from "./scene";
import { mqSteps } from "./steps";

export const messageQueues: Lesson = {
  id: "message-queues",
  home: "system-design",
  slug: "message-queues",
  topic: "Message queues",
  title: "Absorb the spike",
  promise: "Put a queue between the shop and its workers: watch a flash sale become a backlog instead of failures, and park poison jobs.",
  minutes: 7,
  level: 1,
  scene: mqScene,
  model: mqModel,
  controls: {
    workers: {
      label: "Workers",
      min: 2,
      max: 8,
      step: 1,
      readout: "With **{workers}** workers ({capacity} a second), the backlog peaks at **{peakBacklog}** and drains **{drainSec}** after the sale.",
    },
  },
  steps: mqSteps,
  components: ["users", "app-server"],
  buildsOn: ["load-balancing"],
  questions: [],
  cheatsheet: mqCheatsheet,
};
