import type { Lesson } from "@tintelix/schema";
import { lbCheatsheet } from "./cheatsheet";
import { lbModel } from "./model";
import { lbScene } from "./scene";
import { lbSteps } from "./steps";

export const loadBalancing: Lesson = {
  id: "load-balancing",
  home: "system-design",
  slug: "load-balancing",
  topic: "Load balancing",
  title: "Who gets the next request?",
  promise: "See how a load balancer chooses a server, why round robin stumbles on heavy requests, and what layer 7 adds.",
  minutes: 8,
  level: 1,
  scene: lbScene,
  model: lbModel,
  controls: {
    heavyPct: {
      label: "Reports",
      min: 0,
      max: 4,
      step: 0.5,
      unit: "%",
      readout: "With **{heavyPct}** of requests being reports, lookups take **{lookupMs}** and reports **{reportMs}**.",
    },
    traffic: {
      label: "Traffic",
      min: 60,
      max: 200,
      step: 10,
      unit: "/s",
      readout: "At **{traffic}** a second, the busiest server is **{serverLoadPct}** busy and lookups take **{lookupMs}**.",
    },
  },
  steps: lbSteps,
  components: ["users", "load-balancer", "app-server"],
  buildsOn: ["vertical-horizontal-scaling"],
  questions: [],
  cheatsheet: lbCheatsheet,
};
