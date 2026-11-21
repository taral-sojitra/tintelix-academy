import type { Lesson } from "@tintelix/schema";
import { scalingCheatsheet } from "./cheatsheet";
import { scalingModel } from "./model";
import { scalingScene } from "./scene";
import { scalingSteps } from "./steps";

export const scaling: Lesson = {
  id: "vertical-horizontal-scaling",
  home: "system-design",
  slug: "vertical-horizontal-scaling",
  topic: "Vertical vs horizontal scaling",
  title: "Bigger box or more boxes?",
  promise: "See when one bigger server is enough, when many smaller ones win, and why shared parts stop the gain.",
  minutes: 7,
  level: 1,
  scene: scalingScene,
  model: scalingModel,
  controls: {
    cores: {
      label: "Cores",
      min: 2,
      max: 64,
      step: 2,
      readout: "With **{cores}** cores the server handles **{capacity}** a second and serves **{servedPct}** of requests.",
    },
    nodes: {
      label: "Servers",
      min: 1,
      max: 100,
      step: 1,
      readout: "With **{nodes}** servers the fleet handles **{capacity}** a second: **{speedup}×** one server, **{servedPct}** served.",
    },
  },
  steps: scalingSteps,
  components: ["users", "app-server", "load-balancer"],
  buildsOn: [],
  questions: [],
  cheatsheet: scalingCheatsheet,
};
