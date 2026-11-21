import type { Lesson } from "@tintelix/schema";
import { retryCheatsheet } from "./cheatsheet";
import { retryModel } from "./model";
import { retryScene } from "./scene";
import { retrySteps } from "./steps";

export const retriesAndCircuitBreakers: Lesson = {
  id: "retries-and-circuit-breakers",
  home: "system-design",
  slug: "retries-and-circuit-breakers",
  topic: "Timeouts, retries and circuit breakers",
  title: "Don't kick a slow service",
  promise: "Fit timeouts into a budget, watch retries bury a slow service, spread them with jitter, and let a circuit breaker give it room.",
  minutes: 7,
  level: 1,
  scene: retryScene,
  model: retryModel,
  controls: {
    pricingTimeoutMs: {
      label: "Pricing timeout",
      min: 100,
      max: 800,
      step: 50,
      unit: "ms",
      readout: "With a **{pricingTimeoutMs}** pricing timeout, the order service needs **{orderUsedMs}**: **{marginMs}** spare.",
    },
  },
  steps: retrySteps,
  components: ["users", "app-server"],
  buildsOn: ["idempotency"],
  questions: [],
  cheatsheet: retryCheatsheet,
};
