import type { Lesson } from "@tintelix/schema";
import { handshakeCheatsheet } from "./cheatsheet";
import { handshakeModel } from "./model";
import { handshakeScene } from "./scene";
import { handshakeSteps } from "./steps";

export const handshakeLesson: Lesson = {
  id: "net-handshake",
  home: "networks",
  slug: "handshake",
  topic: "Three-way handshake",
  title: "Hello before the data",
  promise: "Watch SYN, SYN-ACK and ACK open a TCP connection, see the round trip it costs before your request can leave, and why apps reuse connections.",
  minutes: 6,
  level: 1,
  scene: handshakeScene,
  model: handshakeModel,
  controls: {
    rttMs: {
      label: "Round trip",
      min: 5,
      max: 300,
      step: 5,
      unit: "ms",
      readout: "Connected after **{handshakeMs}**; the first byte of the page arrives at **{firstByteMs}**.",
    },
    requests: {
      label: "Requests",
      min: 1,
      max: 50,
      step: 1,
      unit: "requests",
      readout: "New connection each: **{newEachMs}**. One connection: **{reusedMs}**.",
    },
  },
  steps: handshakeSteps,
  components: [],
  buildsOn: ["net-tcp-vs-udp"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: handshakeCheatsheet,
};
