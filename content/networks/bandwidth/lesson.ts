import type { Lesson } from "@tintelix/schema";
import { bandwidthCheatsheet } from "./cheatsheet";
import { bandwidthModel } from "./model";
import { bandwidthScene } from "./scene";
import { bandwidthSteps } from "./steps";

export const bandwidthLesson: Lesson = {
  id: "net-bandwidth",
  home: "networks",
  slug: "bandwidth",
  topic: "Bandwidth and throughput",
  title: "A wide pipe, a slow trickle",
  promise: "See why a 100 Mbit/s plan downloads from across the world at a fraction of that: bandwidth is the pipe, throughput is what arrives, and round trips and loss set the gap.",
  minutes: 7,
  level: 2,
  scene: bandwidthScene,
  model: bandwidthModel,
  controls: {
    bandwidthMbps: {
      label: "Bandwidth",
      min: 10,
      max: 1000,
      step: 10,
      unit: "Mbit/s",
      readout: "**{throughputMbps} Mbit/s** arrives: {utilPct} of the pipe.",
    },
    rttMs: {
      label: "Round trip",
      min: 5,
      max: 300,
      step: 5,
      unit: "ms",
      readout: "TCP allows **{lossLimitMbps} Mbit/s**; **{bdpKB} KB** must be in flight to fill the pipe.",
    },
    lossPct: {
      label: "Packet loss",
      min: 0,
      max: 2,
      step: 0.01,
      unit: "%",
      readout: "**{throughputMbps} Mbit/s** arrives; 100 MB takes **{actualSec}**.",
    },
  },
  steps: bandwidthSteps,
  components: ["cdn"],
  buildsOn: ["net-latency"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: bandwidthCheatsheet,
};
