import type { Lesson } from "@tintelix/schema";
import { httpCheatsheet } from "./cheatsheet";
import { httpModel } from "./model";
import { httpScene } from "./scene";
import { httpSteps } from "./steps";

export const httpLesson: Lesson = {
  id: "net-http",
  home: "networks",
  slug: "http",
  topic: "HTTP and HTTPS",
  title: "One request or many at once?",
  promise: "Load the same page over HTTP/1.1, HTTP/2 and HTTP/3, count the round trips each needs, and see what HTTPS adds on top.",
  minutes: 8,
  level: 2,
  scene: httpScene,
  model: httpModel,
  controls: {
    resources: {
      label: "Files on the page",
      min: 1,
      max: 120,
      step: 1,
      unit: "files",
      readout: "HTTP/1.1 **{h1Ms}**, HTTP/2 **{h2Ms}**, HTTP/3 **{h3Ms}**.",
    },
    rttMs: {
      label: "Round trip",
      min: 10,
      max: 300,
      step: 10,
      unit: "ms",
      readout: "Every round trip saved is **{rttMs}** sooner.",
    },
  },
  steps: httpSteps,
  components: [],
  buildsOn: ["net-handshake"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: httpCheatsheet,
};
