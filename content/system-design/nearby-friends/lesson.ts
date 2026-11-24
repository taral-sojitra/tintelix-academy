import type { Lesson } from "@tintelix/schema";
import { friendsCheatsheet } from "./cheatsheet";
import { friendsModel } from "./model";
import { friendsScene } from "./scene";
import { friendsSteps } from "./steps";

export const nearbyFriends: Lesson = {
  id: "nearby-friends",
  home: "system-design",
  slug: "nearby-friends",
  topic: "Design nearby friends",
  title: "Which friends are close right now?",
  promise: "Show which friends are within five kilometres as forty million phones move: stop polling, publish each update to a channel, and send only to friends close enough.",
  minutes: 8,
  level: 2,
  scene: friendsScene,
  model: friendsModel,
  controls: {
    updateEvery: {
      label: "Update every",
      min: 10,
      max: 60,
      step: 5,
      unit: "s",
      readout: "**{updateRateM} million** updates a second become **{fanoutM} million** pub/sub messages on **{pubsubNodes}** nodes.",
    },
  },
  steps: friendsSteps,
  components: ["users", "app-server", "cache"],
  buildsOn: ["fan-out", "chat-app", "proximity-service"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: friendsCheatsheet,
};
