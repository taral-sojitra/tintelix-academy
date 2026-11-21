import type { Lesson } from "@tintelix/schema";
import { idemCheatsheet } from "./cheatsheet";
import { idemModel } from "./model";
import { idemScene } from "./scene";
import { idemSteps } from "./steps";

export const idempotency: Lesson = {
  id: "idempotency",
  home: "system-design",
  slug: "idempotency",
  topic: "Idempotency",
  title: "Charged twice?",
  promise: "Follow a lost reply into a double charge, then stop it with an idempotency key claimed atomically.",
  minutes: 6,
  level: 1,
  scene: idemScene,
  model: idemModel,
  controls: {},
  steps: idemSteps,
  components: ["users", "app-server", "cache"],
  buildsOn: ["message-queues"],
  questions: [],
  cheatsheet: idemCheatsheet,
};
