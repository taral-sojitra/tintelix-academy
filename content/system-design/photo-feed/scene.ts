import type { SceneSpec } from "@tintelix/schema";

/**
 * Readers along the top row (feed service, then the precomputed feed cache), posters along the bottom
 * (post service, then the posts store), and the fan-out workers on the right linking a new post to the
 * feeds it lands in.
 */
export const feedScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 120, w: 180, h: 84, kind: "users", label: "Followers", sub: "opening the feed" },
    poster: { x: 24, y: 300, w: 180, h: 84, kind: "users", label: "Posters", sub: "photos and video" },
    api: { x: 270, y: 120, w: 190, h: 84, kind: "app", label: "Feed service", sub: "builds a page" },
    postsvc: { x: 270, y: 300, w: 190, h: 84, kind: "app", label: "Post service", sub: "store the post" },
    feeds: { x: 530, y: 110, w: 210, h: 104, kind: "cache", label: "Feed cache", sub: "a list per follower", hidden: true },
    db: { x: 530, y: 284, w: 210, h: 124, kind: "db", label: "Posts", sub: "by author" },
    fanout: { x: 790, y: 200, w: 194, h: 120, kind: "app", label: "Fan-out workers", sub: "push into feeds", hidden: true },
  },
  wires: {
    u_f: { from: [204, 162], to: [270, 162] },
    f_fc: { from: [460, 162], to: [530, 162] },
    f_db: { from: [460, 186], to: [530, 336] },
    p_ps: { from: [204, 342], to: [270, 342] },
    ps_db: { from: [460, 342], to: [530, 352] },
    db_fo: { from: [740, 345], to: [790, 290] },
    fo_fc: { from: [790, 240], to: [740, 162] },
  },
  board: {
    legend: [["cyan", "feed load"], ["green", "feed page"], ["red", "too slow"], ["amber", "new post"], ["violet", "fan-out write"]],
    flows: {
      pull: { path: [{ wire: "u_f", dir: 1, at: "api" }, { wire: "f_db", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      post: { from: "poster", path: [{ wire: "p_ps", dir: 1, at: "postsvc" }, { wire: "ps_db", dir: 1, at: "db" }], color: "amber", back: "green" },
      read: { path: [{ wire: "u_f", dir: 1, at: "api" }, { wire: "f_fc", dir: 1, at: "feeds" }], color: "cyan", back: "green" },
      fan: { from: "db", path: [{ wire: "db_fo", dir: 1, at: "fanout" }, { wire: "fo_fc", dir: 1, at: "feeds" }], color: "violet", small: true },
      celebFan: {
        from: "db",
        path: [{ wire: "db_fo", dir: 1, at: "fanout" }, { wire: "fo_fc", dir: 1, at: "feeds" }],
        color: "violet",
        small: true,
        float: { at: "fanout", text: "one post, {celebM} million writes", color: "amber", chance: 0.08 },
      },
      merge: {
        path: [{ wire: "u_f", dir: 1, at: "api" }, { wire: "f_fc", dir: 1, at: "feeds" }, { wire: "f_fc", dir: -1, at: "api" }, { wire: "f_db", dir: 1, at: "db" }],
        color: "cyan",
        back: "green",
        float: { at: "db", text: "+ big accounts' posts", color: "cyan", chance: 0.08 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Feed loads", icon: "activity", hue: "cyan", value: "{feedRate}/s", note: "{feedPeak}/s at peak" },
          { id: "b", label: "Posts", icon: "spark", hue: "amber", value: "{postRate}/s", note: "{readWriteRatio} loads per post" },
          { id: "c", label: "Media", icon: "db", hue: "violet", value: "{mediaPbYear} PB a year", note: "photos and video, new" },
        ],
      },
      {
        flows: [{ flow: "pull", weight: 4 }, { flow: "post", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Lookups per load", icon: "list", hue: "cyan", value: "{follows}", note: "one per account followed" },
          { id: "b", label: "Lookups now", icon: "activity", hue: "violet", value: "{pullLookups}/s", note: "a quiet launch" },
          { id: "c", label: "Posts store busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "a million lookups a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "pull", weight: 4 }, { flow: "post", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Lookups per load", icon: "list", hue: "cyan", value: "{follows}", note: "every load, every account" },
          { id: "b", label: "Lookups now", icon: "activity", hue: "violet", value: "{pullLookups}/s", note: "{feedPeak} loads a second" },
          { id: "c", label: "Posts store busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "{dbFailPct} of loads too slow", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "read", weight: 8 }, { flow: "post", weight: 1 }, { flow: "fan", weight: 3 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Lookups per load", icon: "bolt", hue: "green", value: "1", note: "the feed is already built", mood: "good" },
          { id: "b", label: "Fan-out writes", icon: "spark", hue: "violet", value: "{fanWrites}/s", note: "{postRate} posts × {avgFollowers} followers" },
          { id: "c", label: "Fan-out busy", icon: "gauge", hue: "cyan", value: "{fanBusyPct}", note: "of 200,000 writes a second", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "read", weight: 8 }, { flow: "post", weight: 1 }, { flow: "celebFan", weight: 6 }],
        rate: 7,
        tiles: [
          { id: "a", label: "One post", icon: "users", hue: "amber", value: "{celebM} million", note: "followers to write to", mood: "bad" },
          { id: "b", label: "Fan-out takes", icon: "timer", hue: "violet", value: "{celebDrainSec}", note: "at 200,000 writes a second", mood: "good", moodIf: { output: "celebDrainSec", above: 60, mood: "bad" } },
          { id: "c", label: "Everyone else", icon: "hourglass", hue: "cyan", value: "waits", note: "the same workers are busy", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "read", weight: 6 }, { flow: "merge", weight: 2 }, { flow: "post", weight: 1 }, { flow: "fan", weight: 3 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Push threshold", icon: "spark", hue: "green", value: "{thresholdM} million", note: "followers; at most {maxFanSec} a post", mood: "good" },
          { id: "b", label: "Pulled at read", icon: "list", hue: "violet", value: "{bigFollowed} accounts", note: "the big ones you follow" },
          { id: "c", label: "Posts store busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "{mergeRate} merge lookups/s", mood: "good" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      fanout: [{ kind: "text", text: "Busy for {celebDrainSec} on one post", when: { output: "mode", above: 3.5, below: 4.5 } }],
    },
    states: [
      { node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } },
      { node: "fanout", cls: "tx-hot", when: { output: "mode", above: 3.5, below: 4.5 } },
    ],
    subs: { users: "{feedPeak}/s peak", poster: "{postRate} posts/s" },
  },
};
