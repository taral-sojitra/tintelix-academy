import type { Lesson } from "@tintelix/schema";
import { subnetCheatsheet } from "./cheatsheet";
import { subnetModel } from "./model";
import { subnetScene } from "./scene";
import { subnetSteps } from "./steps";

export const subnetLesson: Lesson = {
  id: "net-subnetting",
  home: "networks",
  slug: "subnetting",
  topic: "Subnetting and CIDR",
  title: "Same street or across town?",
  promise: "Cut one /24 into four /26 subnets, use the mask to decide whether two hosts can talk directly, and see why CIDR replaced fixed-size blocks.",
  minutes: 8,
  level: 2,
  scene: subnetScene,
  model: subnetModel,
  controls: {
    subPrefix: {
      label: "Subnet prefix",
      min: 24,
      max: 30,
      step: 1,
      unit: "bits",
      readout: "**{subnets}** subnets of **{subnetSize}** addresses, {usable} for devices.",
    },
    hostB: {
      label: "Host B's last number",
      min: 1,
      max: 254,
      step: 1,
      unit: "",
      readout: "B is in **.{bNet}/{subPrefix}**, A in **.{aNet}/{subPrefix}**; router hops: **{routerHops}**.",
    },
    needHosts: {
      label: "Devices needed",
      min: 10,
      max: 100000,
      step: 10,
      unit: "devices",
      readout: "CIDR: **/{cidrPrefix}** ({cidrWastePct} spare). Old classes: **/{classPrefix}** ({classWastePct} spare).",
    },
  },
  steps: subnetSteps,
  components: [],
  buildsOn: ["net-ip-addressing"],
  questions: [],
  cheatsheetInputs: { mode: 2 },
  cheatsheet: subnetCheatsheet,
};
