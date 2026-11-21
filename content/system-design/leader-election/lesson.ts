import type { Lesson } from "@tintelix/schema";
import { leaderCheatsheet } from "./cheatsheet";
import { leaderModel } from "./model";
import { leaderScene } from "./scene";
import { leaderSteps } from "./steps";

export const leaderElection: Lesson = {
  id: "leader-election",
  home: "system-design",
  slug: "leader-election",
  topic: "Leader election and consensus",
  title: "Who's in charge now?",
  promise: "Watch servers elect a new leader when the old one dies, see why only a majority can lead, and stop a stale leader's write with a fencing token.",
  minutes: 7,
  level: 1,
  scene: leaderScene,
  model: leaderModel,
  controls: {
    electionTimeoutMs: {
      label: "Election timeout",
      min: 200,
      max: 5000,
      step: 100,
      unit: "ms",
      readout: "With a **{electionTimeoutMs}** timeout, writes wait about **{failoverMs}** when the leader dies, and blips start about **{falseElections}** needless elections a day (assuming 200 blips a day, 250 ms long on average).",
    },
  },
  steps: leaderSteps,
  components: ["app-server", "database"],
  buildsOn: ["replication", "cap-theorem"],
  questions: [],
  cheatsheet: leaderCheatsheet,
};
