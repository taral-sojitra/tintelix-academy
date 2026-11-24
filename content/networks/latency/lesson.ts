import type { Lesson } from "@tintelix/schema";
import { latencyCheatsheet } from "./cheatsheet";
import { latencyModel } from "./model";
import { latencyScene } from "./scene";
import { latencySteps } from "./steps";

export const latencyLesson: Lesson = {
  id: "net-latency",
  home: "networks",
  slug: "latency",
  topic: "Latency",
  title: "Where the milliseconds go",
  promise: "Take a Mumbai-to-London round trip apart into distance, hops and queues, count the round trips a page needs, and see why moving closer beats everything else.",
  minutes: 7,
  level: 1,
  scene: latencyScene,
  model: latencyModel,
  controls: {
    distanceKm: {
      label: "Distance",
      min: 50,
      max: 15000,
      step: 50,
      unit: "km",
      readout: "**{propRttMs}** of travel there and back; the page takes **{pageMs}**.",
    },
    queueMs: {
      label: "Time in queues",
      min: 0,
      max: 300,
      step: 5,
      unit: "ms",
      readout: "Round trip **{rttMs}**: distance is {propPct} of it.",
    },
  },
  steps: latencySteps,
  components: ["cdn"],
  buildsOn: ["net-handshake"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: latencyCheatsheet,
};
