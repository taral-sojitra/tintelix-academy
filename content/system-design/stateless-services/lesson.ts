import type { Lesson } from "@tintelix/schema";
import { sessionCheatsheet } from "./cheatsheet";
import { sessionModel } from "./model";
import { sessionScene } from "./scene";
import { sessionSteps } from "./steps";

export const statelessServices: Lesson = {
  id: "stateless-services",
  home: "system-design",
  slug: "stateless-services",
  topic: "Stateless services and sticky sessions",
  title: "Where does my login live?",
  promise: "See why sessions in a server's memory break load balancing and deploys, and what a shared session store costs.",
  minutes: 7,
  level: 1,
  scene: sessionScene,
  model: sessionModel,
  controls: {
    baseMs: {
      label: "Request time",
      min: 5,
      max: 300,
      step: 5,
      unit: "ms",
      readout: "A **{lookupMs}** session read on a **{baseMs}** request makes it **{addedPct}** slower.",
    },
  },
  steps: sessionSteps,
  components: ["users", "load-balancer", "app-server", "cache"],
  buildsOn: ["load-balancing"],
  questions: [],
  cheatsheet: sessionCheatsheet,
};
