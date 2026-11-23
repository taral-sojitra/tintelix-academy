import type { Lesson } from "@tintelix/schema";
import { videoCheatsheet } from "./cheatsheet";
import { videoModel } from "./model";
import { videoScene } from "./scene";
import { videoSteps } from "./steps";

export const videoStreaming: Lesson = {
  id: "video-streaming",
  home: "system-design",
  slug: "video-streaming",
  topic: "Design video streaming (YouTube, Netflix)",
  title: "Upload once, play anywhere",
  promise: "Send 25 terabits a second without a stall: encode each title once into many qualities in parallel, let the player pick quality segment by segment, and push copies into viewers' providers before anyone presses play.",
  minutes: 8,
  level: 2,
  scene: videoScene,
  model: videoModel,
  controls: {
    workers: {
      label: "Encoders per title",
      min: 50,
      max: 1000,
      step: 50,
      unit: "encoders",
      readout: "**{segments}** segments on **{workers}** encoders: playable in **{parallelSec}**.",
    },
    edgeHitPct: {
      label: "Served at the edge",
      min: 50,
      max: 99.5,
      step: 0.5,
      unit: "%",
      readout: "The origin sends **{originTbps} Tbps** and is **{originBusyPct}** busy.",
    },
  },
  steps: videoSteps,
  components: ["users", "cdn"],
  buildsOn: ["cdn", "object-storage", "message-queues"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: videoCheatsheet,
};
