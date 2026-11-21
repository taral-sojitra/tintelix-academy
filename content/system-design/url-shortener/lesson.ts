import type { Lesson } from "@tintelix/schema";
import { urlCheatsheet } from "./cheatsheet";
import { urlModel } from "./model";
import { urlScene } from "./scene";
import { urlSteps } from "./steps";

export const urlShortener: Lesson = {
  id: "url-shortener",
  home: "system-design",
  slug: "url-shortener",
  topic: "Design a URL shortener",
  title: "Turn a long link into seven characters",
  promise: "Size a link shortener from its traffic, watch one database drown, then fix it with a cache and a counter that turns numbers into short codes.",
  minutes: 9,
  level: 2,
  scene: urlScene,
  model: urlModel,
  controls: {
    cacheHitPct: {
      label: "Cache hit rate",
      min: 0,
      max: 100,
      step: 5,
      unit: "%",
      readout: "The database is **{dbBusyPct}** busy with **{dbReadRate}** reads a second.",
    },
    codeLength: {
      label: "Code length",
      min: 5,
      max: 8,
      step: 1,
      unit: "characters",
      readout: "**{codeSpaceT} trillion** possible codes; 5 years of links use **{codesUsedPct}** of them.",
    },
  },
  steps: urlSteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["estimation", "caching", "sharding"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: urlCheatsheet,
};
