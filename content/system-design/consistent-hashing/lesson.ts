import type { Lesson } from "@tintelix/schema";
import { ringCheatsheet } from "./cheatsheet";
import { ringModel } from "./model";
import { ringScene } from "./scene";
import { ringSteps } from "./steps";

export const consistentHashing: Lesson = {
  id: "consistent-hashing",
  home: "system-design",
  slug: "consistent-hashing",
  topic: "Consistent hashing",
  title: "Add a server, move few keys",
  promise: "Add a cache server and watch hash mod N move almost every key, then see a hash ring move just one slice.",
  minutes: 6,
  level: 1,
  scene: ringScene,
  model: ringModel,
  controls: {
    servers: {
      label: "Servers before",
      min: 2,
      max: 6,
      step: 1,
      readout: "Going from **{servers}** to **{newServers}** servers under mod N moves **{movedPct}** of keys.",
    },
    vnodes: {
      label: "Points per server",
      min: 1,
      max: 200,
      step: 1,
      readout: "With **{vnodes}** points per server, the largest owns **{maxSharePct}** of keys (fair: **{fairPct}**).",
    },
  },
  steps: ringSteps,
  components: ["app-server", "cache", "database"],
  buildsOn: ["sharding"],
  questions: [],
  cheatsheet: ringCheatsheet,
};
