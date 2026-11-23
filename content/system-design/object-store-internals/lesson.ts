import type { Lesson } from "@tintelix/schema";
import { objectStoreCheatsheet } from "./cheatsheet";
import { objectStoreModel } from "./model";
import { objectStoreScene } from "./scene";
import { objectStoreSteps } from "./steps";

export const objectStoreInternals: Lesson = {
  id: "object-store-internals",
  home: "system-design",
  slug: "object-store-internals",
  topic: "Design S3-like object storage",
  title: "Store a trillion files, lose none",
  promise: "Keep a trillion objects safe on disks that die every day: spread each object across racks as copies or as data and parity pieces, repair faster than disks fail, and keep a sharded map of where everything is.",
  minutes: 8,
  level: 2,
  scene: objectStoreScene,
  model: objectStoreModel,
  controls: {
    parity: {
      label: "Parity pieces",
      min: 1,
      max: 6,
      step: 1,
      unit: "pieces",
      readout: "Survives **{tolerance}** failures in **{storedPb} PB**, {overheadX}× the data.",
    },
  },
  steps: objectStoreSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["replication", "object-storage"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: objectStoreCheatsheet,
};
