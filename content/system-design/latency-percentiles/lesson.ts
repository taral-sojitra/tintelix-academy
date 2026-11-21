import type { Lesson } from "@tintelix/schema";
import { latencyCheatsheet } from "./cheatsheet";
import { latencyModel } from "./model";
import { latencyScene } from "./scene";
import { latencySteps } from "./steps";

export const latencyPercentiles: Lesson = {
  id: "latency-percentiles",
  home: "system-design",
  slug: "latency-percentiles",
  topic: "Latency percentiles",
  title: "The average is lying",
  promise: "Read a latency histogram and see why p99, not the average, is what your users feel.",
  minutes: 8,
  level: 1,
  scene: latencyScene,
  model: latencyModel,
  controls: {
    slowPct: {
      label: "Slow share",
      min: 0.1,
      max: 10,
      step: 0.1,
      unit: "%",
      readout: "With **{slowPct}** of requests slow, the average is **{meanMs}** and p99 is **{callP99Ms}**.",
    },
    calls: {
      label: "Calls a page",
      min: 1,
      max: 100,
      step: 1,
      readout: "With **{calls}** calls a page, **{pageSlowPct}** of pages wait on a slow call. Page p50 is **{pageP50Ms}**; page p99 is **{pageP99Ms}**.",
    },
    hedgeMs: {
      label: "Hedge after",
      min: 1,
      max: 250,
      step: 1,
      unit: "ms",
      readout: "Copying calls still running after **{hedgeMs}** sends **{hedgedPct}** more calls, and page p99 is **{pageP99Ms}**.",
    },
  },
  steps: latencySteps,
  components: ["users", "app-server"],
  buildsOn: [],
  questions: [],
  cheatsheet: latencyCheatsheet,
};
