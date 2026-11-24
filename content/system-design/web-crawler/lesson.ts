import type { Lesson } from "@tintelix/schema";
import { crawlerCheatsheet } from "./cheatsheet";
import { crawlerModel } from "./model";
import { crawlerScene } from "./scene";
import { crawlerSteps } from "./steps";

export const webCrawler: Lesson = {
  id: "web-crawler",
  home: "system-design",
  slug: "web-crawler",
  topic: "Design a web crawler",
  title: "Read the whole web, politely",
  promise: "Fetch two billion pages a month without hammering any one site: a queue per site, a filter for URLs already seen, and a budget against endless pages.",
  minutes: 9,
  level: 2,
  scene: crawlerScene,
  model: crawlerModel,
  controls: {
    politeDelay: {
      label: "Delay per site",
      min: 0.5,
      max: 5,
      step: 0.5,
      unit: "s",
      readout: "Any one site gets **{hotHostRate}** a second; **{hostsInParallel}** sites are crawled at once.",
    },
  },
  steps: crawlerSteps,
  components: ["app-server", "cache", "database"],
  buildsOn: ["bloom-filters", "message-queues"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: crawlerCheatsheet,
};
