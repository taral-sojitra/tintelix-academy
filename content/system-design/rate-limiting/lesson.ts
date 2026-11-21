import type { Lesson } from "@tintelix/schema";
import { limitCheatsheet } from "./cheatsheet";
import { limitModel } from "./model";
import { limitScene } from "./scene";
import { limitSteps } from "./steps";

export const rateLimiting: Lesson = {
  id: "rate-limiting",
  home: "system-design",
  slug: "rate-limiting",
  topic: "Rate limiting",
  title: "One client floods the API",
  promise: "Stop one flooding client from taking down the API for everyone, without breaking short bursts from normal users.",
  minutes: 6,
  level: 1,
  scene: limitScene,
  model: limitModel,
  controls: {
    bucket: {
      label: "Bucket size",
      min: 5,
      max: 100,
      step: 5,
      readout: "A bucket of **{bucket}** lets **{burstAllowed}** of a {burst}-request burst through and refills in **{refillSec}**.",
    },
  },
  steps: limitSteps,
  components: ["users", "load-balancer", "app-server"],
  buildsOn: ["load-balancing"],
  questions: [],
  cheatsheet: limitCheatsheet,
};
