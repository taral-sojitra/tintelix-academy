import type { Lesson } from "@tintelix/schema";
import { firewallCheatsheet } from "./cheatsheet";
import { firewallModel } from "./model";
import { firewallScene } from "./scene";
import { firewallSteps } from "./steps";

export const firewallLesson: Lesson = {
  id: "net-firewalls",
  home: "networks",
  slug: "firewalls",
  topic: "Firewalls",
  title: "Who gets in?",
  promise: "Put a firewall in front of a web server, SSH and a database, write rules that let in only what should get in, and see why a firewall must remember who asked.",
  minutes: 7,
  level: 2,
  scene: firewallScene,
  model: firewallModel,
  controls: {
    probesPerMin: {
      label: "Scanner probes a minute",
      min: 0,
      max: 3000,
      step: 30,
      unit: "a minute",
      readout: "**{blockedPerMin}** dropped at the firewall; **{reachedPerMin}** reach the public website.",
    },
  },
  steps: firewallSteps,
  components: [],
  buildsOn: ["net-ports-sockets"],
  questions: [],
  cheatsheetInputs: { mode: 3 },
  cheatsheet: firewallCheatsheet,
};
