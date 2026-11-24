import type { Lesson } from "@tintelix/schema";
import { paymentCheatsheet } from "./cheatsheet";
import { paymentModel } from "./model";
import { paymentScene } from "./scene";
import { paymentSteps } from "./steps";

export const paymentSystem: Lesson = {
  id: "payment-system",
  home: "system-design",
  slug: "payment-system",
  topic: "Design a payment system",
  title: "Take the money exactly once",
  promise: "Charge 20 million payments a day without ever charging anyone twice: write the intent before calling the card network, key every request, record money in a double-entry ledger, and reconcile every night.",
  minutes: 8,
  level: 2,
  scene: paymentScene,
  model: paymentModel,
  controls: {
    timeoutsPer10k: {
      label: "Timeouts per 10,000 payments",
      min: 0.5,
      max: 10,
      step: 0.5,
      readout: "Charge first: **{dupsPerDay}** double charges a day. Intent first: **0**.",
    },
  },
  steps: paymentSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["distributed-transactions", "idempotency", "retries-and-circuit-breakers"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: paymentCheatsheet,
};
