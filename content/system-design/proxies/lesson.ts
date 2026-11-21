import type { Lesson } from "@tintelix/schema";
import { proxyCheatsheet } from "./cheatsheet";
import { proxyModel } from "./model";
import { proxyScene } from "./scene";
import { proxySteps } from "./steps";

export const proxies: Lesson = {
  id: "proxies",
  home: "system-design",
  slug: "proxies",
  topic: "Forward and reverse proxy",
  title: "Who speaks for whom?",
  promise: "Tell a forward proxy from a reverse proxy, and see how buffering keeps slow clients from tying up servers.",
  minutes: 7,
  level: 1,
  scene: proxyScene,
  model: proxyModel,
  controls: {
    employees: {
      label: "Staff",
      min: 10,
      max: 2000,
      step: 10,
      readout: "With **{employees}** staff, the office would pull **{officeGb} GB**; through the proxy, **{proxyGb} GB**.",
    },
    slowPct: {
      label: "Slow clients",
      min: 0,
      max: 60,
      step: 5,
      unit: "%",
      readout: "With **{slowPct}** slow clients, a worker is held **{holdMs}** and **{busyWorkers}** workers are needed.",
    },
  },
  steps: proxySteps,
  components: ["users", "app-server"],
  buildsOn: ["load-balancing"],
  questions: [],
  cheatsheet: proxyCheatsheet,
};
