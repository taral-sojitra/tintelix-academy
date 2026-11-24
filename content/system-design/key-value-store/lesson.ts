import type { Lesson } from "@tintelix/schema";
import { kvCheatsheet } from "./cheatsheet";
import { kvModel } from "./model";
import { kvScene } from "./scene";
import { kvSteps } from "./steps";

export const keyValueStore: Lesson = {
  id: "key-value-store",
  home: "system-design",
  slug: "key-value-store",
  topic: "Design a key-value store",
  title: "A store that always takes the write",
  promise: "Spread keys around a ring, keep three copies agreed by quorum, write next door when a node dies, and keep both versions when two writes collide.",
  minutes: 10,
  level: 3,
  scene: kvScene,
  model: kvModel,
  controls: {
    writeQuorum: {
      label: "Write quorum W",
      min: 1,
      max: 3,
      step: 1,
      unit: "of 3",
      readout: "Writes wait **{writeLatencyMs}**; right after a write, **{staleReadPct}** of reads miss it.",
    },
    readQuorum: {
      label: "Read quorum R",
      min: 1,
      max: 3,
      step: 1,
      unit: "of 3",
      readout: "Reads wait **{readLatencyMs}**; right after a write, **{staleReadPct}** of reads miss it.",
    },
  },
  steps: kvSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["replication", "sharding", "consistent-hashing", "bloom-filters", "cap-theorem", "consistency-models"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: kvCheatsheet,
};
