import type { SceneSpec } from "@tintelix/schema";

/**
 * Clients on the left, the gateways that enforce the limit in the middle, and on the right a column
 * of the counter store (one node, then more shards) above the API servers. The per-gateway counters
 * panel shows what each gateway sees before there is a shared counter; the response panel shows the
 * headers a limited request gets back.
 */
export const limiterScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 190, w: 180, h: 84, kind: "users", label: "API clients", sub: "one key in focus" },
    gw: { x: 280, y: 190, w: 190, h: 84, kind: "lb", label: "Gateways", sub: "20, round robin" },
    api: { x: 560, y: 320, w: 210, h: 84, kind: "app", label: "API servers", sub: "do the work" },
    counters: { x: 540, y: 30, w: 444, h: 236, kind: "curve", label: "What each gateway counts", sub: "", hidden: true },
    redis: { x: 560, y: 46, w: 210, h: 104, kind: "cache", label: "Counter store", sub: "Redis, shard 1", hidden: true },
    redis2: { x: 560, y: 170, w: 210, h: 104, kind: "cache", label: "More shards", sub: "keys hashed across them", hidden: true },
    headers: { x: 790, y: 46, w: 194, h: 250, kind: "curve", label: "Over the limit", sub: "", hidden: true },
  },
  wires: {
    u_g: { from: [204, 232], to: [280, 232] },
    g_a: { from: [470, 250], to: [560, 362] },
    g_r: { from: [470, 214], to: [560, 98] },
    g_r2: { from: [470, 228], to: [560, 222] },
  },
  board: {
    legend: [["cyan", "request"], ["green", "allowed"], ["red", "refused (429)"], ["violet", "counter check"]],
    flows: {
      allowed: { path: [{ wire: "u_g", dir: 1, at: "gw" }, { wire: "g_a", dir: 1, at: "api" }], color: "cyan", back: "green" },
      refused: { path: [{ wire: "u_g", dir: 1, at: "gw" }], color: "cyan", back: "red", float: { at: "gw", text: "429", color: "red", chance: 0.08 } },
      check: { from: "gw", path: [{ wire: "g_r", dir: 1, at: "redis" }], color: "violet", small: true, back: "green" },
      check2: { from: "gw", path: [{ wire: "g_r2", dir: 1, at: "redis2" }], color: "violet", small: true, back: "green", fail: { at: "redis2", share: "shardDownPct" } },
    },
    modes: [
      {
        flows: [{ flow: "allowed", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Limit per key", icon: "gauge", hue: "violet", value: "{limitPerMin}/min", note: "{limitRate} a second" },
          { id: "b", label: "This key sends", icon: "activity", hue: "cyan", value: "{clientRate}/s", note: "a normal client" },
          { id: "c", label: "Allowed", icon: "check", hue: "green", value: "{allowedRate}/s", note: "all of it", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "allowed", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Limit per key", icon: "gauge", hue: "violet", value: "{limitRate}/s", note: "on each gateway" },
          { id: "b", label: "Each gateway sees", icon: "lb", hue: "cyan", value: "{perServerSeen}/s", note: "under the limit, so it allows" },
          { id: "c", label: "Actually allowed", icon: "alert", hue: "amber", value: "{allowedRate}/s", note: "{overLimitX}× the limit", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "allowed", weight: "allowedSharePct" }, { flow: "refused", weight: "blockedPct" }, { flow: "check", weight: 60 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Allowed", icon: "check", hue: "green", value: "{allowedRate}/s", note: "the limit, exactly", mood: "good" },
          { id: "b", label: "Refused (429)", icon: "alert", hue: "amber", value: "{blockedPct}", note: "of this key's requests" },
          { id: "c", label: "Counter store busy", icon: "db", hue: "violet", value: "{redisBusyPct}", note: "{checkRate} checks a second", mood: "good", moodIf: { output: "redisBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "allowed", weight: "allowedSharePct" }, { flow: "refused", weight: "blockedPct" }, { flow: "check", weight: 30 }, { flow: "check2", weight: 30 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Checks", icon: "activity", hue: "cyan", value: "{checkRate}/s", note: "one per request" },
          { id: "b", label: "Each shard busy", icon: "db", hue: "violet", value: "{redisBusyPct}", note: "{redisShards} shards", mood: "good", moodIf: { output: "redisBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Allowed", icon: "check", hue: "green", value: "{allowedRate}/s", note: "still exactly the limit", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "allowed", weight: "allowedSharePct" }, { flow: "refused", weight: "blockedPct" }, { flow: "check", weight: 30 }, { flow: "check2", weight: 30 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Counter shard", icon: "alert", hue: "amber", value: "down", note: "one of {redisShards}", mood: "bad" },
          { id: "b", label: "Keys unchecked", icon: "gauge", hue: "violet", value: "{uncheckedPct}", note: "allowed without a limit" },
          { id: "c", label: "Requests failed", icon: "check", hue: "green", value: "none", note: "failing open", mood: "good" },
        ],
      },
    ],
    widgets: {
      counters: [
        {
          kind: "bars",
          rows: [
            { label: "gateway 1", output: "gatewaySeenPct", max: 100 },
            { label: "gateway 2", output: "gatewaySeenPct", max: 100 },
            { label: "gateway 3", output: "gatewaySeenPct", max: 100 },
            { label: "gateway 20", output: "gatewaySeenPct", max: 100 },
          ],
        },
        { kind: "text", text: "Each sees {perServerSeen}/s of its {limitRate}/s limit. Together: {allowedRate}/s." },
      ],
      redis: [{ kind: "meter", output: "redisBusyPct", max: 100, text: "{redisBusyPct} busy" }],
      redis2: [{ kind: "text", text: "Down: its keys fail open", when: { output: "shardDownPct", above: 0 } }],
      headers: [
        {
          kind: "log",
          lines: [
            { text: "429 Too Many Requests" },
            { text: "Retry-After: 6" },
            { text: "X-RateLimit-Limit: 600" },
            { text: "X-RateLimit-Remaining: 0" },
            { text: "X-RateLimit-Reset: 6" },
          ],
        },
      ],
    },
    states: [
      { node: "redis", cls: "tx-hot", when: { output: "redisBusyPct", above: 100 } },
      { node: "redis2", cls: "tx-down", when: { output: "shardDownPct", above: 0 } },
    ],
    subs: { users: "one key: {clientRate}/s", redis2: "{redisShards} shards in all" },
  },
};
