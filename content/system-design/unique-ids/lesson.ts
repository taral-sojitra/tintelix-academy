import type { Lesson } from "@tintelix/schema";
import { idsCheatsheet } from "./cheatsheet";
import { idsModel } from "./model";
import { idsScene } from "./scene";
import { idsSteps } from "./steps";

export const uniqueIds: Lesson = {
  id: "unique-ids",
  home: "system-design",
  slug: "unique-ids",
  topic: "Design a unique ID generator",
  title: "Never hand out the same ID twice",
  promise: "Watch one shared counter drown, see what random UUIDs cost, then pack time, machine and sequence into 64 bits that fifty servers make without asking.",
  minutes: 8,
  level: 2,
  scene: idsScene,
  model: idsModel,
  controls: {
    machineBits: {
      label: "Machine bits",
      min: 4,
      max: 18,
      step: 1,
      unit: "bits",
      readout: "**{machines}** machine numbers for {servers} servers; each can make **{perMachineRate}** IDs a second.",
    },
  },
  steps: idsSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["sharding", "leader-election"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: idsCheatsheet,
};
