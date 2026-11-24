import type { Lesson } from "@tintelix/schema";
import { clicksCheatsheet } from "./cheatsheet";
import { clicksModel } from "./model";
import { clicksScene } from "./scene";
import { clicksSteps } from "./steps";

export const clickAggregation: Lesson = {
  id: "click-aggregation",
  home: "system-design",
  slug: "click-aggregation",
  topic: "Design ad click aggregation (analytics)",
  title: "Count every click exactly once",
  promise: "Count 8 billion ad clicks a day, per ad, per minute, exactly once: log every click, count by the time it happened, close windows with a watermark, drop retries by click ID, and recount for billing.",
  minutes: 8,
  level: 2,
  scene: clicksScene,
  model: clicksModel,
  controls: {
    slackSec: {
      label: "Watermark slack",
      min: 5,
      max: 300,
      step: 5,
      unit: "s",
      readout: "**{latePct}** of clicks arrive too late ({lateM} million a day); every minute's result waits {slackSec}.",
    },
  },
  steps: clicksSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["message-queues", "idempotency", "message-queue-design"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: clicksCheatsheet,
};
