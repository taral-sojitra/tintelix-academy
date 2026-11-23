import type { Lesson } from "@tintelix/schema";
import { emailCheatsheet } from "./cheatsheet";
import { emailModel } from "./model";
import { emailScene } from "./scene";
import { emailSteps } from "./steps";

export const emailService: Lesson = {
  id: "email-service",
  home: "system-design",
  slug: "email-service",
  topic: "Design an email service",
  title: "An inbox for a billion people",
  promise: "Receive, keep and search mail for a billion inboxes, and send it out without landing in spam: shard whole mailboxes by user, store attachments once, index each mailbox on its own, and guard the sending reputation.",
  minutes: 8,
  level: 2,
  scene: emailScene,
  model: emailModel,
  controls: {
    deadPct: {
      label: "Dead addresses in a campaign",
      min: 1,
      max: 15,
      step: 1,
      unit: "%",
      readout: "**{hardBounces}** hard bounces from one campaign; every one is suppressed for good.",
    },
  },
  steps: emailSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["sharding", "object-storage", "search-engine"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: emailCheatsheet,
};
