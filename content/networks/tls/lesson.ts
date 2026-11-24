import type { Lesson } from "@tintelix/schema";
import { tlsCheatsheet } from "./cheatsheet";
import { tlsModel } from "./model";
import { tlsScene } from "./scene";
import { tlsSteps } from "./steps";

export const tlsLesson: Lesson = {
  id: "net-tls",
  home: "networks",
  slug: "tls",
  topic: "TLS",
  title: "Private before the first byte",
  promise: "Watch TLS 1.3 agree a secret key in the open and check the server's certificate in one round trip, so the café Wi-Fi sees which site you visit but nothing you do there.",
  minutes: 8,
  level: 2,
  scene: tlsScene,
  model: tlsModel,
  controls: {
    rttMs: {
      label: "Round trip",
      min: 10,
      max: 300,
      step: 10,
      unit: "ms",
      readout: "First byte: TLS 1.2 **{tls12FirstByteMs}**, TLS 1.3 **{tls13FirstByteMs}**, QUIC **{quicFirstByteMs}**.",
    },
  },
  steps: tlsSteps,
  components: [],
  buildsOn: ["net-http"],
  questions: [],
  cheatsheetInputs: { mode: 4 },
  cheatsheet: tlsCheatsheet,
};
