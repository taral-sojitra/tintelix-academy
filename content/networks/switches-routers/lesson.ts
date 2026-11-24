import type { Lesson } from "@tintelix/schema";
import { switchCheatsheet } from "./cheatsheet";
import { switchModel } from "./model";
import { switchScene } from "./scene";
import { switchSteps } from "./steps";

export const switchLesson: Lesson = {
  id: "net-switches-routers",
  home: "networks",
  slug: "switches-routers",
  topic: "Switches vs routers",
  title: "Next door or another network?",
  promise: "Watch a switch learn which port every device is on and stop flooding, then follow a packet through a router into another network.",
  minutes: 7,
  level: 1,
  scene: switchScene,
  model: switchModel,
  controls: {
    devices: {
      label: "Devices on the network",
      min: 2,
      max: 48,
      step: 1,
      unit: "devices",
      readout: "A hub copies each frame **{hubCopies}** times; **{wastedPct}** of the copies are wasted. A switch: once.",
    },
  },
  steps: switchSteps,
  components: [],
  buildsOn: ["net-arp"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: switchCheatsheet,
};
