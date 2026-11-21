import type { Lesson } from "@tintelix/schema";
import { consistencyCheatsheet } from "./cheatsheet";
import { consistencyModel } from "./model";
import { timelineScene } from "./scene";
import { consistencySteps } from "./steps";

export const consistencyModels: Lesson = {
  id: "consistency-models",
  home: "system-design",
  slug: "consistency-models",
  topic: "Consistency models",
  title: "How current is this read?",
  promise: "Replay one timeline of a post and a reply under eventual, read-your-writes, causal and strong consistency.",
  minutes: 6,
  level: 1,
  scene: timelineScene,
  model: consistencyModel,
  controls: {
    rttMs: {
      label: "Round trip to the leaders",
      min: 10,
      max: 200,
      step: 5,
      unit: "ms",
      readout: "With the leaders **{rttMs}** away, a strong read takes **{readMs}**.",
    },
  },
  steps: consistencySteps,
  components: ["users", "database"],
  buildsOn: ["cap-theorem"],
  questions: [],
  cheatsheet: consistencyCheatsheet,
};
