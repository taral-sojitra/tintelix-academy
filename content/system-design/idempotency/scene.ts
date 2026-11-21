import type { SceneSpec } from "@tintelix/schema";

/** Phone → payments API → card network; from step 2 the API also keeps idempotency keys. */
export const idemScene: SceneSpec = {
  kind: "idem",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 390 },
  nodes: {
    client: { x: 16, y: 196, w: 172, h: 86, kind: "users", label: "Phone app", sub: "at checkout" },
    api: { x: 262, y: 184, w: 210, h: 110, kind: "app", label: "Payments API", sub: "charges the card" },
    bank: { x: 650, y: 70, w: 300, h: 110, kind: "origin", label: "Card network", sub: "moves the money" },
    keys: { x: 650, y: 300, w: 300, h: 110, kind: "cache", label: "Idempotency keys", sub: "key → saved result", hidden: true },
  },
  wires: {
    c_a: { from: [188, 239], to: [262, 239] },
    a_b: { from: [472, 228], to: [650, 125] },
    a_k: { from: [472, 252], to: [650, 355] },
  },
};
