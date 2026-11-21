import type { Lesson } from "@tintelix/schema";
import { uploadCheatsheet } from "./cheatsheet";
import { uploadModel } from "./model";
import { uploadScene } from "./scene";
import { uploadSteps } from "./steps";

export const objectStorage: Lesson = {
  id: "object-storage",
  home: "system-design",
  slug: "object-storage",
  topic: "Object storage",
  title: "Let uploads skip your servers",
  promise: "Move photo uploads off your app servers with signed URLs, and send big videos in parts so a dropped connection costs little.",
  minutes: 6,
  level: 1,
  scene: uploadScene,
  model: uploadModel,
  controls: {
    partMb: {
      label: "Part size",
      min: 5,
      max: 500,
      step: 5,
      unit: "MB",
      readout: "With **{partMb} MB** parts ({parts} of them), a drop costs **{redoMb} MB**: **{redoSec}** more.",
    },
  },
  steps: uploadSteps,
  components: ["users", "app-server"],
  buildsOn: ["cdn"],
  questions: [],
  cheatsheet: uploadCheatsheet,
};
