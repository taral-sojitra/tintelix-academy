import type { Lesson } from "@tintelix/schema";
import { metricsCheatsheet } from "./cheatsheet";
import { metricsModel } from "./model";
import { metricsScene } from "./scene";
import { metricsSteps } from "./steps";

export const metricsAlerting: Lesson = {
  id: "metrics-alerting",
  home: "system-design",
  slug: "metrics-alerting",
  topic: "Design metrics monitoring and alerting",
  title: "Spot the outage before users do",
  promise: "Take 800,000 samples a second from 60,000 servers and page someone only when users are hurt: a sharded, compressed time-series store, rollups for old data, bounded labels, and alerts on symptoms held for minutes.",
  minutes: 8,
  level: 2,
  scene: metricsScene,
  model: metricsModel,
  controls: {
    rawDays: {
      label: "Days of raw points",
      min: 3,
      max: 60,
      step: 1,
      unit: "days",
      readout: "Two years kept in **{rollupTb} TB**; all raw would be {rawTb2y} TB.",
    },
    userIds: {
      label: "User IDs in a label",
      min: 0,
      max: 1000000,
      step: 50000,
      readout: "**{badSeries}** series, **{seriesMemMb} MB** of memory, from one metric.",
    },
  },
  steps: metricsSteps,
  components: ["users", "app-server", "database"],
  buildsOn: ["latency-percentiles", "availability", "health-checks"],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: metricsCheatsheet,
};
