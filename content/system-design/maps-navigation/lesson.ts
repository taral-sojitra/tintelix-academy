import type { Lesson } from "@tintelix/schema";
import { mapsCheatsheet } from "./cheatsheet";
import { mapsModel } from "./model";
import { mapsScene } from "./scene";
import { mapsSteps } from "./steps";

export const mapsNavigation: Lesson = {
  id: "maps-navigation",
  home: "system-design",
  slug: "maps-navigation",
  topic: "Design maps and navigation",
  title: "The fastest way home",
  promise: "Show the map anywhere in a blink and find the fastest route with today's traffic: draw tiles once and serve them from the edge, and prepare the road graph so a search touches thousands of intersections, not hundreds of thousands.",
  minutes: 8,
  level: 2,
  scene: mapsScene,
  model: mapsModel,
  controls: {
    cdnHitPct: {
      label: "Tiles served by the CDN",
      min: 80,
      max: 99.9,
      step: 0.1,
      unit: "%",
      readout: "The tile store serves **{originRate}** tiles a second.",
    },
    tripKm: {
      label: "Trip length",
      min: 5,
      max: 120,
      step: 5,
      unit: "km",
      readout: "Searching every road touches **{naiveExplored}** intersections; with shortcuts, about **{hierExplored}**.",
    },
  },
  steps: mapsSteps,
  components: ["users", "cdn", "app-server"],
  buildsOn: ["cdn", "proximity-service"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: mapsCheatsheet,
};
