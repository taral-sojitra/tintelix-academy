import type { Lesson } from "@tintelix/schema";
import { feedCheatsheet } from "./cheatsheet";
import { feedModel } from "./model";
import { feedScene } from "./scene";
import { feedSteps } from "./steps";

export const photoFeed: Lesson = {
  id: "photo-feed",
  home: "system-design",
  slug: "photo-feed",
  topic: "Design a photo feed (news feed)",
  title: "Fill the home feed in a blink",
  promise: "Serve 29,000 feed loads a second by building feeds when posts are made, and keep one celebrity's post from stalling everyone else's.",
  minutes: 9,
  level: 2,
  scene: feedScene,
  model: feedModel,
  controls: {
    celebFollowers: {
      label: "Followers of the poster",
      min: 1e6,
      max: 100e6,
      step: 1e6,
      unit: "followers",
      readout: "Pushing one post takes **{celebDrainSec}** at 200,000 writes a second.",
    },
  },
  steps: feedSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["caching", "object-storage", "fan-out"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: feedCheatsheet,
};
