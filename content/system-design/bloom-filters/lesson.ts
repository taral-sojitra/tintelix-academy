import type { Lesson } from "@tintelix/schema";
import { bloomCheatsheet } from "./cheatsheet";
import { bloomModel } from "./model";
import { bloomScene } from "./scene";
import { bloomSteps } from "./steps";

export const bloomFilters: Lesson = {
  id: "bloom-filters",
  home: "system-design",
  slug: "bloom-filters",
  topic: "Bloom filters",
  title: "Definitely not here",
  promise: "Put a small bit array in front of the disk and watch it turn away lookups for keys that don't exist.",
  minutes: 6,
  level: 1,
  scene: bloomScene,
  model: bloomModel,
  controls: {
    bitsPerKey: {
      label: "Bits per key",
      min: 2,
      max: 20,
      step: 1,
      readout: "At **{bitsPerKey}** bits a key ({hashes} hashes), false positives are **{fpPct}** and the disk sees **{diskReads}** reads a second.",
    },
    keys: {
      label: "Keys stored",
      min: 50_000_000,
      max: 400_000_000,
      step: 10_000_000,
      readout: "With **{keys}** keys in a filter built for {designKeys}, false positives are **{fpPct}**.",
    },
  },
  steps: bloomSteps,
  components: ["app-server", "database"],
  buildsOn: ["indexing"],
  questions: [],
  cheatsheet: bloomCheatsheet,
};
