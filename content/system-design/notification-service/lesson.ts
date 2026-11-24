import type { Lesson } from "@tintelix/schema";
import { notifyCheatsheet } from "./cheatsheet";
import { notifyModel } from "./model";
import { notifyScene } from "./scene";
import { notifySteps } from "./steps";

export const notificationService: Lesson = {
  id: "notification-service",
  home: "system-design",
  slug: "notification-service",
  topic: "Design a notification service",
  title: "A million alerts, none sent twice",
  promise: "Send an incident notice to fifteen million people in five minutes: a queue per channel so slow SMS can't block push, and a reservation that stops every duplicate.",
  minutes: 10,
  level: 3,
  scene: notifyScene,
  model: notifyModel,
  controls: {
    smsRate: {
      label: "Gateway rate for SMS",
      min: 300,
      max: 3000,
      step: 100,
      unit: "a second",
      readout: "All SMS sent after **{smsDrainSec}**; **{smsAtTargetPct}** by the 5-minute deadline.",
    },
    partitions: {
      label: "Audience partitions",
      min: 8,
      max: 64,
      step: 8,
      unit: "partitions",
      readout: "**{resolveRate}** users resolved a second: the whole audience in **{resolveSec}**.",
    },
  },
  steps: notifySteps,
  components: ["app-server", "database"],
  buildsOn: ["message-queues", "idempotency", "rate-limiting", "retries-and-circuit-breakers"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: notifyCheatsheet,
};
