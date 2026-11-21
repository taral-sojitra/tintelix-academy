import type { Lesson } from "@tintelix/schema";
import { regionCheatsheet } from "./cheatsheet";
import { regionModel } from "./model";
import { regionScene } from "./scene";
import { regionSteps } from "./steps";

export const multiRegion: Lesson = {
  id: "multi-region",
  home: "system-design",
  slug: "multi-region",
  topic: "Multi-region and failover",
  title: "A whole region goes dark",
  promise: "Fail over from Mumbai to Virginia with a standby, then with both regions serving, and watch replication lag hand out stale reads.",
  minutes: 8,
  level: 1,
  scene: regionScene,
  model: regionModel,
  controls: {
    dnsTtlSec: {
      label: "DNS TTL",
      min: 30,
      max: 600,
      step: 30,
      unit: "s",
      readout: "With a **{dnsTtlSec}** TTL, writes still stop for **{writesDowntime}**, but everyone has moved only after **{cutoverDowntime}**.",
    },
  },
  steps: regionSteps,
  components: ["users", "load-balancer", "app-server", "database"],
  buildsOn: ["cdn", "replication"],
  questions: [],
  cheatsheet: regionCheatsheet,
};
