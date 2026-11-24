import type { Lesson } from "@tintelix/schema";
import { osiCheatsheet } from "./cheatsheet";
import { osiModel } from "./model";
import { osiScene } from "./scene";
import { osiSteps } from "./steps";

export const osiLesson: Lesson = {
  id: "net-osi-model",
  home: "networks",
  slug: "osi-model",
  topic: "OSI model",
  title: "Seven layers, one message",
  promise: "Follow one web request down seven layers, across the wire and back up, and see which header each layer adds and what those headers cost.",
  minutes: 7,
  level: 1,
  scene: osiScene,
  model: osiModel,
  controls: {
    payloadBytes: {
      label: "Message size",
      min: 100,
      max: 20000,
      step: 100,
      unit: "bytes",
      readout: "**{segments}** segments and **{headerBytes} bytes** of headers: **{overheadPct}** of what crosses the wire.",
    },
  },
  steps: osiSteps,
  components: [],
  buildsOn: [],
  questions: [],
  cheatsheetInputs: { mode: 5 },
  cheatsheet: osiCheatsheet,
};
