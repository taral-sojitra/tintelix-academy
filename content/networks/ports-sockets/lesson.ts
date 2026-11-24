import type { Lesson } from "@tintelix/schema";
import { portsCheatsheet } from "./cheatsheet";
import { portsModel } from "./model";
import { portsScene } from "./scene";
import { portsSteps } from "./steps";

export const portsLesson: Lesson = {
  id: "net-ports-sockets",
  home: "networks",
  slug: "ports-sockets",
  topic: "Ports and sockets",
  title: "Which program gets this?",
  promise: "See how one server address carries a web server, SSH and a database at once, how ports and both ends of a connection tell every conversation apart, and how a client can run out of ports.",
  minutes: 7,
  level: 1,
  scene: portsScene,
  model: portsModel,
  controls: {
    connsPerSec: {
      label: "New connections a second",
      min: 0,
      max: 1500,
      step: 10,
      unit: "a second",
      readout: "**{portsInUse}** ports held, **{portsUsedPct}** of the range; **{failPct}** of new connections fail.",
    },
  },
  steps: portsSteps,
  components: [],
  buildsOn: ["net-tcp-vs-udp"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: portsCheatsheet,
};
