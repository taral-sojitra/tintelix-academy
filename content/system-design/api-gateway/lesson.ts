import type { Lesson } from "@tintelix/schema";
import { gatewayCheatsheet } from "./cheatsheet";
import { gatewayModel } from "./model";
import { gatewayScene } from "./scene";
import { gatewaySteps } from "./steps";

export const apiGateway: Lesson = {
  id: "api-gateway",
  home: "system-design",
  slug: "api-gateway",
  topic: "API gateway",
  title: "One front door",
  promise: "Replace six doors with one: put sign-in, limits and routing in an API gateway, and let it gather a screen's calls.",
  minutes: 6,
  level: 1,
  scene: gatewayScene,
  model: gatewayModel,
  controls: {
    rttMs: {
      label: "Phone round trip",
      min: 20,
      max: 400,
      step: 10,
      unit: "ms",
      readout: "On a **{rttMs}** phone round trip, the aggregated home screen takes **{screenMs}**.",
    },
  },
  steps: gatewaySteps,
  components: ["users", "load-balancer", "app-server"],
  buildsOn: ["proxies", "rate-limiting"],
  questions: [],
  cheatsheet: gatewayCheatsheet,
};
