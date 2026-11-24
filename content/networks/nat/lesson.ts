import type { Lesson } from "@tintelix/schema";
import { natCheatsheet } from "./cheatsheet";
import { natModel } from "./model";
import { natScene } from "./scene";
import { natSteps } from "./steps";

export const natLesson: Lesson = {
  id: "net-nat",
  home: "networks",
  slug: "nat",
  topic: "NAT",
  title: "Twenty devices, one address",
  promise: "Watch a home router rewrite every device's address and port to its one public address, keep a table to send replies back, and drop anything nobody asked for.",
  minutes: 7,
  level: 2,
  scene: natScene,
  model: natModel,
  controls: {
    devices: {
      label: "Devices at home",
      min: 1,
      max: 100,
      step: 1,
      unit: "devices",
      readout: "**{natEntries}** NAT entries: **{portsUsedPct}** of one address's ports.",
    },
    connsPerDevice: {
      label: "Connections per device",
      min: 1,
      max: 200,
      step: 1,
      unit: "connections",
      readout: "One address fits about **{maxDevices}** devices at {connsPerDevice} each.",
    },
  },
  steps: natSteps,
  components: [],
  buildsOn: ["net-ip-addressing", "net-ports-sockets"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: natCheatsheet,
};
