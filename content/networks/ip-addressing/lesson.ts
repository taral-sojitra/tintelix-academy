import type { Lesson } from "@tintelix/schema";
import { ipCheatsheet } from "./cheatsheet";
import { ipModel } from "./model";
import { ipScene } from "./scene";
import { ipSteps } from "./steps";

export const ipLesson: Lesson = {
  id: "net-ip-addressing",
  home: "networks",
  slug: "ip-addressing",
  topic: "IP addressing",
  title: "Where on the internet?",
  promise: "Read an IP address as 32 bits, split it into network and host, see why private addresses stay home, and why IPv6 needed 128 bits.",
  minutes: 7,
  level: 1,
  scene: ipScene,
  model: ipModel,
  controls: {
    prefixLen: {
      label: "Prefix length",
      min: 8,
      max: 30,
      step: 1,
      unit: "bits",
      readout: "**/{prefixLen}**: {addresses} addresses, **{hosts}** for devices.",
    },
  },
  steps: ipSteps,
  components: [],
  buildsOn: ["net-tcp-ip-model"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: ipCheatsheet,
};
