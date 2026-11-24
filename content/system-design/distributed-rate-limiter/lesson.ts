import type { Lesson } from "@tintelix/schema";
import { limiterCheatsheet } from "./cheatsheet";
import { limiterModel } from "./model";
import { limiterScene } from "./scene";
import { limiterSteps } from "./steps";

export const distributedRateLimiter: Lesson = {
  id: "distributed-rate-limiter",
  home: "system-design",
  slug: "distributed-rate-limiter",
  topic: "Design a distributed rate limiter",
  title: "One limit across a thousand servers",
  promise: "See twenty gateways let one key through at fifteen times its limit, fix it with one shared counter, then shard it and decide what happens when it dies.",
  minutes: 8,
  level: 2,
  scene: limiterScene,
  model: limiterModel,
  controls: {
    redisShards: {
      label: "Counter shards",
      min: 1,
      max: 8,
      step: 1,
      unit: "shards",
      readout: "Each shard handles a share of **{checkRate}** checks a second and is **{redisBusyPct}** busy.",
    },
  },
  steps: limiterSteps,
  components: ["users", "load-balancer", "app-server", "cache"],
  buildsOn: ["rate-limiting", "api-gateway"],
  questions: [],
  cheatsheetInputs: { mode: 3, redisShards: 4 },
  cheatsheet: limiterCheatsheet,
};
