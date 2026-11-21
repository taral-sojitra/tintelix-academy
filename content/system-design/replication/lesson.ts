import type { Lesson } from "@tintelix/schema";
import { replCheatsheet } from "./cheatsheet";
import { replModel } from "./model";
import { replScene } from "./scene";
import { replSteps } from "./steps";

export const replication: Lesson = {
  id: "replication",
  home: "system-design",
  slug: "replication",
  topic: "Replication",
  title: "Copies that fall behind",
  promise: "Spread reads over replicas, catch the stale read that replication lag causes, and see what a failover can lose.",
  minutes: 7,
  level: 1,
  scene: replScene,
  model: replModel,
  controls: {
    replicas: {
      label: "Replicas",
      min: 1,
      max: 3,
      step: 1,
      readout: "With **{replicas}** replicas, each serves **{perReplicaReads}** reads a second (**{replicaBusyPct}** busy); writes stay at **{writeRps}** on the primary.",
    },
    lagMs: {
      label: "Replica lag",
      min: 10,
      max: 300,
      step: 10,
      readout: "With replicas **{lagMs}** behind, **{staleBackPct}** of read-backs return the old value.",
    },
  },
  steps: replSteps,
  components: ["app-server", "database"],
  buildsOn: ["sql-vs-nosql"],
  questions: [],
  cheatsheet: replCheatsheet,
};
