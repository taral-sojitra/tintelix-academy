import type { Lesson } from "@tintelix/schema";
import { availabilityCheatsheet } from "./cheatsheet";
import { availabilityModel } from "./model";
import { availabilityScene } from "./scene";
import { availabilitySteps } from "./steps";

export const availability: Lesson = {
  id: "availability",
  home: "system-design",
  slug: "availability",
  topic: "Availability and the nines",
  title: "Nobody broke their promise",
  promise: "See why a chain of reliable services is less reliable than any one of them, and what copies really buy.",
  minutes: 7,
  level: 1,
  scene: availabilityScene,
  model: availabilityModel,
  controls: {
    services: {
      label: "Services in the path",
      min: 1,
      max: 6,
      step: 1,
      readout: "With **{services}** services in a row, checkout is up **{pathAvail}**: down **{pathDowntime}** a month.",
    },
    copies: {
      label: "Copies of each",
      min: 1,
      max: 3,
      step: 1,
      readout: "With **{copies}** copies of each service, checkout is up **{pathAvail}**: down **{pathDowntime}** a month.",
    },
    sharedPct: {
      label: "Shared failure",
      min: 0,
      max: 0.2,
      step: 0.01,
      unit: "%",
      readout: "If the copies fail together **{sharedPct}** of the time, checkout is up **{pathAvail}**: down **{pathDowntime}** a month.",
    },
  },
  steps: availabilitySteps,
  components: ["users", "app-server"],
  buildsOn: [],
  questions: [],
  cheatsheet: availabilityCheatsheet,
};
