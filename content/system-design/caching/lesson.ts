import type { Lesson } from "@tintelix/schema";
import { cachingCheatsheet } from "./cheatsheet";
import { cachingModel } from "./model";
import { cachingScene } from "./scene";
import { cachingSteps } from "./steps";

export const caching: Lesson = {
  id: "caching",
  home: "system-design",
  slug: "caching",
  topic: "Caching",
  title: "Survive the flash sale",
  promise: "Keep popular answers close, so the database only sees the questions it hasn't been asked before.",
  minutes: 9,
  level: 1,
  scene: cachingScene,
  model: cachingModel,
  controls: { hitRate: { label: "Cache hit rate", min: 0, max: 1, step: 0.01, unit: "%", readout: "DB reads = (1 − hit rate) × {traffic} = **{dbReads}** a second, so the database is **{dbBusyPct}** busy and p95 is **{p95}**." } },
  steps: cachingSteps,
  components: ["users", "load-balancer", "app-server", "cache", "database"],
  buildsOn: ["vertical-horizontal-scaling"],
  questions: [],
  cheatsheetInputs: { hitRate: 0.82 },
  cheatsheet: cachingCheatsheet,
};
