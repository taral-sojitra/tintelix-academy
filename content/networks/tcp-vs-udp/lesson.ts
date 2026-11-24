import type { Lesson } from "@tintelix/schema";
import { tcpUdpCheatsheet } from "./cheatsheet";
import { tcpUdpModel } from "./model";
import { tcpUdpScene } from "./scene";
import { tcpUdpSteps } from "./steps";

export const tcpUdpLesson: Lesson = {
  id: "net-tcp-vs-udp",
  home: "networks",
  slug: "tcp-vs-udp",
  topic: "TCP vs UDP",
  title: "Every byte, or right now?",
  promise: "Send a download over TCP and a call over UDP through the same lossy internet, and see what each does when a packet goes missing.",
  minutes: 7,
  level: 1,
  scene: tcpUdpScene,
  model: tcpUdpModel,
  controls: {
    lossPct: {
      label: "Packet loss",
      min: 0,
      max: 10,
      step: 0.5,
      unit: "%",
      readout: "TCP delivers **{tcpDeliveredPct}** but a call would freeze **{tcpFrozenPct}** of the time; UDP misses **{udpGapPct}**.",
    },
    rttMs: {
      label: "Round trip",
      min: 10,
      max: 300,
      step: 10,
      unit: "ms",
      readout: "Each loss stalls TCP for **{stallMs}**.",
    },
  },
  steps: tcpUdpSteps,
  components: [],
  buildsOn: ["net-tcp-ip-model"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: tcpUdpCheatsheet,
};
