import type { Lesson } from "@tintelix/schema";
import { mqCheatsheet } from "./cheatsheet";
import { mqModel } from "./model";
import { mqScene } from "./scene";
import { mqSteps } from "./steps";

export const messageQueueDesign: Lesson = {
  id: "message-queue-design",
  home: "system-design",
  slug: "message-queue-design",
  topic: "Design a distributed message queue",
  title: "A queue that keeps every message",
  promise: "Take 2 million messages a second, lose none, and let every team read and replay them: an append-only log split into partitions, copied to several brokers, with each reader keeping its own offsets.",
  minutes: 8,
  level: 2,
  scene: mqScene,
  model: mqModel,
  controls: {
    consumers: {
      label: "Consumers in one group",
      min: 100,
      max: 800,
      step: 50,
      readout: "**{activeConsumers}** busy, **{idleConsumers}** idle, reading **{consumeRate}** a second against {msgRate} arriving.",
    },
  },
  steps: mqSteps,
  components: ["users", "app-server"],
  buildsOn: ["replication", "message-queues", "leader-election"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: mqCheatsheet,
};
