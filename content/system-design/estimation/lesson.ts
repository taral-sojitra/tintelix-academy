import type { Lesson } from "@tintelix/schema";
import { estimationCheatsheet } from "./cheatsheet";
import { estimationModel } from "./model";
import { estimationScene } from "./scene";
import { estimationSteps } from "./steps";

export const estimation: Lesson = {
  id: "estimation",
  home: "system-design",
  slug: "estimation",
  topic: "Back-of-envelope estimation",
  title: "From users to servers",
  promise: "Turn a user count into requests a second, cores and storage, one simple step at a time.",
  minutes: 8,
  level: 1,
  scene: estimationScene,
  model: estimationModel,
  controls: {
    peakRatio: {
      label: "Peak ratio",
      min: 1,
      max: 6,
      step: 0.5,
      unit: "×",
      readout: "At **{peakRatio}×** the average, the busiest hour brings **{peakRps}** requests a second.",
    },
    targetUtilPct: {
      label: "Utilization target",
      min: 40,
      max: 90,
      step: 5,
      unit: "%",
      readout: "Run each core at **{targetUtilPct}** and you need **{cores}** cores for **{peakRps}** requests a second.",
    },
    recordKb: {
      label: "Record size",
      min: 0.5,
      max: 20,
      step: 0.5,
      unit: "KB",
      readout: "With **{recordKb} KB** records, you keep **{storageTotalTb} TB** a year, copies included.",
    },
    growthPct: {
      label: "Growth a month",
      min: 0,
      max: 15,
      step: 1,
      unit: "%",
      readout: "At **{growthPct}** a month, next year's busiest hour is **{futurePeakRps}** a second: **{futureCores}** cores.",
    },
  },
  steps: estimationSteps,
  components: ["users", "app-server"],
  buildsOn: ["queueing"],
  questions: [],
  cheatsheet: estimationCheatsheet,
};
