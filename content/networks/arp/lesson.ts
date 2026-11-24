import type { Lesson } from "@tintelix/schema";
import { arpCheatsheet } from "./cheatsheet";
import { arpModel } from "./model";
import { arpScene } from "./scene";
import { arpSteps } from "./steps";

export const arpLesson: Lesson = {
  id: "net-arp",
  home: "networks",
  slug: "arp",
  topic: "MAC addresses and ARP",
  title: "Who has 192.168.1.1?",
  promise: "Watch a laptop that knows the router's IP but not its MAC address ask the whole network, hear one answer, and cache it so it never has to ask for every packet.",
  minutes: 6,
  level: 1,
  scene: arpScene,
  model: arpModel,
  controls: {
    devices: {
      label: "Devices on the network",
      min: 2,
      max: 500,
      step: 1,
      unit: "devices",
      readout: "No cache: **{noiseNoCache}** broadcast frames a minute. Cached: **{noiseCached}**.",
    },
    cacheSec: {
      label: "Cache lifetime",
      min: 5,
      max: 600,
      step: 5,
      unit: "s",
      readout: "One question every **{cacheSec} s**: {savedPct} less broadcast noise.",
    },
  },
  steps: arpSteps,
  components: [],
  buildsOn: ["net-ip-addressing"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: arpCheatsheet,
};
