import type { Lesson } from "@tintelix/schema";
import { microCheatsheet } from "./cheatsheet";
import { microModel } from "./model";
import { microScene } from "./scene";
import { microSteps } from "./steps";

export const monolithVsMicroservices: Lesson = {
  id: "monolith-vs-microservices",
  home: "system-design",
  slug: "monolith-vs-microservices",
  topic: "Monolith vs microservices",
  title: "Split it, or keep it whole?",
  promise: "Weigh one deploy for everything against many small ones, and see what turning function calls into network calls costs.",
  minutes: 7,
  level: 1,
  scene: microScene,
  model: microModel,
  controls: {},
  steps: microSteps,
  components: ["users", "app-server"],
  buildsOn: ["distributed-transactions", "api-gateway"],
  questions: [],
  cheatsheet: microCheatsheet,
};
