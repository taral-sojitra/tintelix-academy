import type { Lesson } from "@tintelix/schema";
import { cdnCheatsheet } from "./cheatsheet";
import { cdnModel } from "./model";
import { cdnScene } from "./scene";
import { cdnSteps } from "./steps";

export const cdn: Lesson = {
  id: "cdn",
  home: "system-design",
  slug: "cdn",
  topic: "CDN",
  title: "Serve Mumbai from Mumbai",
  promise: "Keep copies of your pages near your users, so most requests never cross the ocean.",
  minutes: 8,
  level: 1,
  scene: cdnScene,
  model: cdnModel,
  controls: {
    originKm: {
      label: "Origin distance",
      min: 1000,
      max: 17000,
      step: 500,
      unit: "km",
      readout: "One round trip across {originKm} km takes **{rttOriginMs}**. A page takes **{noEdgePageMs}** from there, or **{hitPageMs}** from the Mumbai edge.",
    },
    ttlSec: {
      label: "Page TTL",
      min: 10,
      max: 3600,
      step: 10,
      unit: "s",
      readout: "Each page is asked for {perPageRate} times a second, so with a {ttlSec} TTL **{edgeHitPct}** of reads stay in Mumbai and the origin sees **{originReqs}** a second.",
    },
  },
  steps: cdnSteps,
  components: ["users", "cdn", "app-server"],
  buildsOn: ["caching"],
  questions: [],
  cheatsheetInputs: { edge: 1, ttlSec: 60, purge: 1 },
  cheatsheet: cdnCheatsheet,
};
