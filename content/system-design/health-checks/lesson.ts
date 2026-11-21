import type { Lesson } from "@tintelix/schema";
import { healthCheatsheet } from "./cheatsheet";
import { healthModel } from "./model";
import { healthScene } from "./scene";
import { healthSteps } from "./steps";

export const healthChecks: Lesson = {
  id: "health-checks",
  home: "system-design",
  slug: "health-checks",
  topic: "Heartbeats and health checks",
  title: "Is anyone still there?",
  promise: "See how health checks find a dead server, and how ejecting too eagerly can empty a whole fleet.",
  minutes: 7,
  level: 1,
  scene: healthScene,
  model: healthModel,
  controls: {
    intervalSec: {
      label: "Check every",
      min: 1,
      max: 30,
      step: 1,
      readout: "Checking every **{intervalSec}** finds a dead server in **{detectSec}**; about **{lostBefore}** requests fail first.",
    },
    maxEjectPct: {
      label: "Ejection cap",
      min: 10,
      max: 100,
      step: 10,
      unit: "%",
      readout: "With at most **{maxEjectPct}** ejected, **{inRotation}** servers stay in and **{servedPct}** of requests are served.",
    },
  },
  steps: healthSteps,
  components: ["users", "load-balancer", "app-server"],
  buildsOn: ["load-balancing"],
  questions: [],
  cheatsheet: healthCheatsheet,
};
