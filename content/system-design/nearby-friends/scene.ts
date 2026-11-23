import type { SceneSpec } from "@tintelix/schema";

/**
 * You on the left, the WebSocket servers next, then pub/sub (your channel and its subscribers), then
 * your friends on the right. The latest-locations store sits under the WebSocket servers.
 */
export const friendsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    me: { x: 16, y: 170, w: 170, h: 84, kind: "users", label: "You", sub: "sharing" },
    ws: { x: 230, y: 170, w: 200, h: 84, kind: "app", label: "Socket servers", sub: "one per phone" },
    db: { x: 230, y: 314, w: 200, h: 120, kind: "db", label: "Latest locations", sub: "one row per person" },
    pubsub: { x: 480, y: 120, w: 300, h: 190, kind: "services", label: "Pub/sub", sub: "a channel per person", hidden: true },
    friends: { x: 820, y: 170, w: 164, h: 84, kind: "users", label: "Friends", sub: "nearby ones" },
  },
  wires: {
    m_w: { from: [186, 212], to: [230, 212] },
    w_p: { from: [430, 212], to: [480, 212] },
    p_f: { from: [780, 212], to: [820, 212] },
    w_d: { from: [330, 254], to: [330, 320], straight: true },
  },
  board: {
    legend: [["cyan", "location"], ["green", "answer"], ["red", "too slow"], ["violet", "cache write"]],
    flows: {
      poll: { from: "me", path: [{ wire: "m_w", dir: 1, at: "ws" }, { wire: "w_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      publish: {
        from: "me",
        path: [{ wire: "m_w", dir: 1, at: "ws" }, { wire: "w_p", dir: 1, at: "pubsub" }, { wire: "p_f", dir: 1, at: "friends" }],
        color: "cyan",
        float: { at: "friends", text: "Dev: 3.8 km away", color: "green", chance: 0.1 },
      },
      tooFar: {
        from: "me",
        path: [{ wire: "m_w", dir: 1, at: "ws" }, { wire: "w_p", dir: 1, at: "pubsub" }],
        color: "cyan",
        float: { at: "pubsub", text: "12 km: not sent", color: "amber", chance: 0.1 },
      },
      cacheWrite: { from: "ws", path: [{ wire: "w_d", dir: 1, at: "db" }], color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Sharing at peak", icon: "users", hue: "violet", value: "{sharersM} million", note: "people, opted in" },
          { id: "b", label: "Updates", icon: "activity", hue: "cyan", value: "{updateRateM} million/s", note: "one every {updateEvery} s each" },
          { id: "c", label: "Radius", icon: "gauge", hue: "amber", value: "{radiusKm} km", note: "friends inside it, live" },
        ],
      },
      {
        flows: [{ flow: "poll", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Rows per refresh", icon: "list", hue: "cyan", value: "{friendsEach}", note: "one per friend" },
          { id: "b", label: "Database reads", icon: "activity", hue: "violet", value: "{dbReads}/s", note: "a quiet launch" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "a million reads a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "poll", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Rows per refresh", icon: "list", hue: "cyan", value: "{friendsEach}", note: "mostly unchanged or far away" },
          { id: "b", label: "Database reads", icon: "activity", hue: "violet", value: "{dbReads}/s", note: "everyone, every {updateEvery} s" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "{dbFailPct} too slow", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "publish", weight: 1 }, { flow: "tooFar", weight: 3 }, { flow: "cacheWrite", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Messages out", icon: "activity", hue: "cyan", value: "{fanoutM} million/s", note: "{activeFriends} sharing friends per update" },
          { id: "b", label: "Close enough to send", icon: "check", hue: "green", value: "{forwardedM} million/s", note: "the rest stop at the filter" },
          { id: "c", label: "Database reads", icon: "db", hue: "violet", value: "none", note: "nothing polls", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "publish", weight: 1 }, { flow: "tooFar", weight: 3 }, { flow: "cacheWrite", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Pub/sub nodes", icon: "server", hue: "violet", value: "{pubsubNodes}", note: "a million messages a second each" },
          { id: "b", label: "Channels", icon: "blocks", hue: "cyan", value: "{sharersM} million", note: "spread by hashing user IDs" },
          { id: "c", label: "Latest locations", icon: "db", hue: "amber", value: "{cacheGb} GB", note: "in a cache, expiring" },
        ],
      },
      {
        flows: [{ flow: "publish", weight: 1 }, { flow: "tooFar", weight: 3 }, { flow: "cacheWrite", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Silent for 10 min", icon: "hourglass", hue: "amber", value: "dropped", note: "the location expires" },
          { id: "b", label: "Battery", icon: "bolt", hue: "green", value: "adaptive", note: "update less when still" },
          { id: "c", label: "History", icon: "list", hue: "violet", value: "async", note: "logged off the hot path" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      pubsub: [{ kind: "custom", name: "pubsub" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
