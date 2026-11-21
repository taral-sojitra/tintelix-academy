import type { SceneKind } from "@tintelix/schema";
import { createCacheAsideScene } from "./cache-aside";
import { createCdnScene } from "./cdn";
import { createLatencyScene } from "./latency";
import { createQueueScene } from "./queue";
import { createChainScene } from "./chain";
import { createEstimateScene } from "./estimate";
import { createScaleScene } from "./scale";
import { createBalanceScene } from "./balance";
import { createDataScene } from "./data";
import { createHealthScene } from "./health";
import { createProxyScene } from "./proxy";
import { createSessionScene } from "./session";
import type { SceneFactory } from "./types";

/** The runtime for each scene kind; the player picks one by `lesson.scene.kind`. */
export const scenes: Record<SceneKind, SceneFactory> = {
  "cache-aside": createCacheAsideScene,
  cdn: createCdnScene,
  latency: createLatencyScene,
  queue: createQueueScene,
  chain: createChainScene,
  estimate: createEstimateScene,
  scale: createScaleScene,
  balance: createBalanceScene,
  proxy: createProxyScene,
  health: createHealthScene,
  session: createSessionScene,
  data: createDataScene,
};
