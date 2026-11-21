import type { Lesson } from "@tintelix/schema";
import { fanoutCheatsheet } from "./cheatsheet";
import { fanoutModel } from "./model";
import { fanoutScene } from "./scene";
import { fanoutSteps } from "./steps";

export const fanOut: Lesson = {
  id: "fan-out",
  home: "system-design",
  slug: "fan-out",
  topic: "Fan-out and the news feed",
  title: "A celebrity posts",
  promise: "Build a news feed by copying posts at write time or merging them at read time, and see why big feeds do both.",
  minutes: 6,
  level: 1,
  scene: fanoutScene,
  model: fanoutModel,
  controls: {},
  steps: fanoutSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["message-queues"],
  questions: [],
  cheatsheet: fanoutCheatsheet,
};
