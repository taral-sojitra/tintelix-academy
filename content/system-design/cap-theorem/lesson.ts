import type { Lesson } from "@tintelix/schema";
import { capCheatsheet } from "./cheatsheet";
import { capModel } from "./model";
import { capScene } from "./scene";
import { capSteps } from "./steps";

export const capTheorem: Lesson = {
  id: "cap-theorem",
  home: "system-design",
  slug: "cap-theorem",
  topic: "CAP theorem",
  title: "When the network splits",
  promise: "Cut the link between two sites and choose: refuse requests to stay correct, or answer with data that may be old.",
  minutes: 6,
  level: 1,
  scene: capScene,
  model: capModel,
  controls: {
    rttMs: {
      label: "Round trip between copies",
      min: 1,
      max: 120,
      step: 1,
      unit: "ms",
      readout: "With copies **{rttMs}** apart, each write takes **{commitMs}** and **{inFlight}** writes are in flight.",
    },
  },
  steps: capSteps,
  components: ["users", "database"],
  buildsOn: ["replication"],
  questions: [],
  cheatsheet: capCheatsheet,
};
