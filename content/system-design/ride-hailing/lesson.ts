import type { Lesson } from "@tintelix/schema";
import { rideCheatsheet } from "./cheatsheet";
import { rideModel } from "./model";
import { rideScene } from "./scene";
import { rideSteps } from "./steps";

export const rideHailing: Lesson = {
  id: "ride-hailing",
  home: "system-design",
  slug: "ride-hailing",
  topic: "Design ride hailing",
  title: "A car for every rider in seconds",
  promise: "Match a rider to a nearby driver in seconds while five million drivers report their position: keep positions in memory by map cell, claim a driver before offering, and never give one driver to two riders.",
  minutes: 8,
  level: 2,
  scene: rideScene,
  model: rideModel,
  controls: {
    matchTime: {
      label: "Time to match",
      min: 1,
      max: 6,
      step: 0.5,
      unit: "s",
      readout: "At **{matchRate}** requests a second, **{inFlight}** matches are in progress at once.",
    },
  },
  steps: rideSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["proximity-service", "nearby-friends"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: rideCheatsheet,
};
