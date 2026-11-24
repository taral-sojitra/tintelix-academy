import type { Lesson } from "@tintelix/schema";
import { nearbyCheatsheet } from "./cheatsheet";
import { nearbyModel } from "./model";
import { nearbyScene } from "./scene";
import { nearbySteps } from "./steps";

export const proximityService: Lesson = {
  id: "proximity-service",
  home: "system-design",
  slug: "proximity-service",
  topic: "Design a proximity service",
  title: "Places within two kilometres",
  promise: "Find places near a point among two hundred million: see latitude and longitude indexes fail, then cut the map into geohash cells and pick the cell size.",
  minutes: 9,
  level: 2,
  scene: nearbyScene,
  model: nearbyModel,
  controls: {
    geoLen: {
      label: "Geohash length",
      min: 4,
      max: 7,
      step: 1,
      unit: "characters",
      readout: "**{cellsRead}** cells, **{candidates}** candidates to measure: about **{geoMs}** a search.",
    },
  },
  steps: nearbySteps,
  components: ["users", "app-server", "cache", "database"],
  buildsOn: ["caching", "indexing", "replication"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: nearbyCheatsheet,
};
