import type { SceneSpec } from "@tintelix/schema";

/** A normal author and a celebrity → fan-out workers → followers' feeds. */
export const fanoutScene: SceneSpec = {
  kind: "fanout",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 390 },
  nodes: {
    asha: { x: 16, y: 70, w: 190, h: 86, kind: "users", label: "Asha", sub: "a normal account" },
    celeb: { x: 16, y: 300, w: 190, h: 86, kind: "users", label: "A celebrity", sub: "millions follow" },
    workers: { x: 296, y: 168, w: 236, h: 144, kind: "app", label: "Fan-out workers", sub: "copy posts into feeds" },
    feeds: { x: 630, y: 56, w: 352, h: 370, kind: "db", label: "Followers' feeds", sub: "one list per follower" },
  },
  wires: {
    a_w: { from: [206, 113], to: [296, 226] },
    c_w: { from: [206, 343], to: [296, 254] },
    w_f: { from: [532, 240], to: [630, 240] },
  },
};
