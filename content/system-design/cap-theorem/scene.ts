import type { SceneSpec } from "@tintelix/schema";

/** Users near each site → three copies (two at site A, one at site B) joined by one network link. */
export const capScene: SceneSpec = {
  kind: "cap",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 400 },
  nodes: {
    usersA: { x: 16, y: 96, w: 176, h: 84, kind: "users", label: "Users near A", sub: "most of them" },
    usersB: { x: 16, y: 318, w: 176, h: 84, kind: "users", label: "Users near B", sub: "the rest" },
    n1: { x: 420, y: 40, w: 240, h: 86, kind: "db", label: "Copy 1", sub: "site A" },
    n2: { x: 420, y: 146, w: 240, h: 86, kind: "db", label: "Copy 2", sub: "site A" },
    n3: { x: 420, y: 320, w: 240, h: 86, kind: "db", label: "Copy 3", sub: "site B" },
    rule: { x: 720, y: 40, w: 264, h: 366, kind: "curve", label: "What each side does", sub: "during a split" },
  },
  wires: {
    ua_n1: { from: [192, 138], to: [420, 83] },
    ua_n2: { from: [192, 138], to: [420, 189] },
    ub_n3: { from: [192, 360], to: [420, 363] },
    link: { from: [540, 232], to: [540, 320], label: "network link" },
  },
};
