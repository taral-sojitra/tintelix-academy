import type { Lesson } from "@tintelix/schema";
import { vpnCheatsheet } from "./cheatsheet";
import { vpnModel } from "./model";
import { vpnScene } from "./scene";
import { vpnSteps } from "./steps";

export const vpnLesson: Lesson = {
  id: "net-proxies-vpns",
  home: "networks",
  slug: "proxies-vpns",
  topic: "Proxies and VPNs",
  title: "A tunnel or a middleman?",
  promise: "Reach a private office app from a café by tunnelling whole packets through a VPN, weigh a full tunnel against a split one, and see how a proxy differs.",
  minutes: 7,
  level: 2,
  scene: vpnScene,
  model: vpnModel,
  controls: {
    toVpnMs: {
      label: "Café to VPN server",
      min: 5,
      max: 300,
      step: 5,
      unit: "ms",
      readout: "Web round trip through the VPN: **{vpnMs}**, against {directMs} direct.",
    },
  },
  steps: vpnSteps,
  components: [],
  buildsOn: ["net-tls", "proxies"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: vpnCheatsheet,
};
