import type { Lesson } from "@tintelix/schema";
import { chatCheatsheet } from "./cheatsheet";
import { chatModel } from "./model";
import { chatScene } from "./scene";
import { chatSteps } from "./steps";

export const chatApp: Lesson = {
  id: "chat-app",
  home: "system-design",
  slug: "chat-app",
  topic: "Design a chat app (one-to-one, groups, channels)",
  title: "Delivered, read, and in order",
  promise: "Deliver 220 billion messages a day within a second, in order and never lost: open sockets, durable queues, a wake-up for sleeping phones, and cheap presence.",
  minutes: 10,
  level: 2,
  scene: chatScene,
  model: chatModel,
  controls: {
    pollInterval: {
      label: "Poll every",
      min: 1,
      max: 20,
      step: 1,
      unit: "s",
      readout: "**{pollRateM} million** polls a second, **{emptyPollPct}** empty; a message waits up to **{pollWaitSec}**.",
    },
  },
  steps: chatSteps,
  components: ["users", "load-balancer", "app-server", "database"],
  buildsOn: ["health-checks", "message-queues", "fan-out", "unique-ids"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: chatCheatsheet,
};
