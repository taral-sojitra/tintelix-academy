import type { SceneKind } from "@tintelix/schema";
import { createCacheAsideScene } from "./cache-aside";
import { createCdnScene } from "./cdn";
import { createLatencyScene } from "./latency";
import { createQueueScene } from "./queue";
import { createChainScene } from "./chain";
import { createEstimateScene } from "./estimate";
import { createScaleScene } from "./scale";
import { createBalanceScene } from "./balance";
import { createBloomScene } from "./bloom";
import { createCapScene } from "./cap";
import { createDataScene } from "./data";
import { createHealthScene } from "./health";
import { createIdemScene } from "./idem";
import { createIndexScene } from "./index-lookup";
import { createLimitScene } from "./limit";
import { createMqScene } from "./mq";
import { createProxyScene } from "./proxy";
import { createReplScene } from "./repl";
import { createRingScene } from "./ring";
import { createSessionScene } from "./session";
import { createShardScene } from "./shard";
import { createTimelineScene } from "./timeline";
import { createTxnScene } from "./txn";
import { createUploadScene } from "./upload";
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
  index: createIndexScene,
  repl: createReplScene,
  shard: createShardScene,
  ring: createRingScene,
  bloom: createBloomScene,
  upload: createUploadScene,
  cap: createCapScene,
  timeline: createTimelineScene,
  txn: createTxnScene,
  mq: createMqScene,
  idem: createIdemScene,
  limit: createLimitScene,
};
