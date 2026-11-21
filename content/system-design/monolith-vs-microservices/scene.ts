import type { SceneSpec } from "@tintelix/schema";

/** Shoppers → one monolith (steps 1, 5) or six services where Orders calls the others (steps 2–4). */
const W = 190;
const H = 80;
export const microScene: SceneSpec = {
  kind: "micro",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 24, w: 984, h: 410 },
  nodes: {
    users: { x: 16, y: 196, w: 168, h: 86, kind: "users", label: "Shoppers", sub: "browse and buy" },
    mono: { x: 270, y: 50, w: 440, h: 370, kind: "app", label: "Monolith", sub: "one codebase, one deploy" },
    orders: { x: 300, y: 196, w: W, h: H, kind: "app", label: "Orders", sub: "service", hidden: true },
    search: { x: 300, y: 340, w: W, h: H, kind: "app", label: "Search", sub: "service", hidden: true },
    users_svc: { x: 580, y: 30, w: W, h: H, kind: "app", label: "Users", sub: "service", hidden: true },
    catalog: { x: 790, y: 130, w: W, h: H, kind: "app", label: "Catalog", sub: "service", hidden: true },
    payments: { x: 790, y: 250, w: W, h: H, kind: "app", label: "Payments", sub: "service", hidden: true },
    shipping: { x: 580, y: 350, w: W, h: H, kind: "app", label: "Shipping", sub: "service", hidden: true },
  },
  wires: {
    u_m: { from: [184, 239], to: [270, 239] },
    u_o: { from: [184, 236], to: [300, 236] },
    u_q: { from: [184, 250], to: [300, 380] },
    o_users_svc: { from: [490, 220], to: [580, 70] },
    o_catalog: { from: [490, 228], to: [790, 170] },
    o_payments: { from: [490, 244], to: [790, 290] },
    o_shipping: { from: [490, 252], to: [580, 390] },
  },
};
