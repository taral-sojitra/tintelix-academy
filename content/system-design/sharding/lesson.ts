import type { Lesson } from "@tintelix/schema";
import { shardCheatsheet } from "./cheatsheet";
import { shardModel } from "./model";
import { shardScene } from "./scene";
import { shardSteps } from "./steps";

export const sharding: Lesson = {
  id: "sharding",
  home: "system-design",
  slug: "sharding",
  topic: "Database sharding",
  title: "Too big for one database",
  promise: "Split the writes across shards: watch range sharding burn one shard, hashing even them out, and a hot key break it again.",
  minutes: 7,
  level: 1,
  scene: shardScene,
  model: shardModel,
  controls: {
    shards: {
      label: "Shards",
      min: 2,
      max: 6,
      step: 1,
      readout: "With **{shards}** shards, each takes **{evenLoad}** writes a second (**{hottestPct}** busy); **{servedPct}** are stored.",
    },
    split: {
      label: "Split hot key into",
      min: 1,
      max: 6,
      step: 1,
      readout: "Split into **{split}**, the hottest shard takes **{hottestLoad}** writes a second (**{hottestPct}** busy).",
    },
  },
  steps: shardSteps,
  components: ["app-server", "database"],
  buildsOn: ["replication"],
  questions: [],
  cheatsheet: shardCheatsheet,
};
