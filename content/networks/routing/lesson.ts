import type { Lesson } from "@tintelix/schema";
import { routingCheatsheet } from "./cheatsheet";
import { routingModel } from "./model";
import { routingScene } from "./scene";
import { routingSteps } from "./steps";

export const routingLesson: Lesson = {
  id: "net-routing",
  home: "networks",
  slug: "routing",
  topic: "Routing",
  title: "Hop by hop across the world",
  promise: "Watch a router pick the next hop by the longest matching prefix, see every router on the way decide again, and use traceroute's TTL trick to reveal the path.",
  minutes: 8,
  level: 2,
  scene: routingScene,
  model: routingModel,
  controls: {
    destD: {
      label: "Destination 198.51.100.x",
      min: 1,
      max: 254,
      step: 1,
      unit: "",
      readout: "198.51.100.**{destD}**: {matchCount} routes match, **/{chosenPrefix}** wins; {traceHops} hops, {totalMs}.",
    },
  },
  steps: routingSteps,
  components: [],
  buildsOn: ["net-subnetting", "net-switches-routers"],
  questions: [],
  cheatsheetInputs: { mode: 1 },
  cheatsheet: routingCheatsheet,
};
