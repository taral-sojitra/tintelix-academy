import type { Lesson } from "@tintelix/schema";
import { tcpIpCheatsheet } from "./cheatsheet";
import { tcpIpModel } from "./model";
import { tcpIpScene } from "./scene";
import { tcpIpSteps } from "./steps";

export const tcpIpLesson: Lesson = {
  id: "net-tcp-ip-model",
  home: "networks",
  slug: "tcp-ip-model",
  topic: "TCP/IP model",
  title: "The four layers that ship",
  promise: "Lay the internet's four layers beside OSI's seven, see who runs each one, and follow a packet through a router that only climbs two of them.",
  minutes: 6,
  level: 1,
  scene: tcpIpScene,
  model: tcpIpModel,
  controls: {
    hops: {
      label: "Routers on the way",
      min: 1,
      max: 70,
      step: 1,
      unit: "routers",
      readout: "Ethernet is rewritten **{linkWrites}** times and the TTL ends at **{ttlLeft}**; TCP is still read only **{endReads}** times.",
    },
  },
  steps: tcpIpSteps,
  components: [],
  buildsOn: ["net-osi-model"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: tcpIpCheatsheet,
};
