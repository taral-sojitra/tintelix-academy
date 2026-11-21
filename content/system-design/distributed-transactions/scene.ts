import type { SceneSpec } from "@tintelix/schema";

/** Shoppers → checkout (the coordinator) → Orders, Payments and Inventory, each with its own database. */
const SX = 500;
const SW = 300;
const SH = 96;
const SY = [36, 186, 336];
const C_OUT: [number, number] = [392, 239];

export const txnScene: SceneSpec = {
  kind: "txn",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 412 },
  nodes: {
    users: { x: 16, y: 196, w: 172, h: 86, kind: "users", label: "Shoppers", sub: "placing orders" },
    coord: { x: 212, y: 186, w: 180, h: 106, kind: "app", label: "Checkout", sub: "runs the order" },
    s0: { x: SX, y: SY[0]!, w: SW, h: SH, kind: "db", label: "Orders", sub: "own database" },
    s1: { x: SX, y: SY[1]!, w: SW, h: SH, kind: "db", label: "Payments", sub: "own database" },
    s2: { x: SX, y: SY[2]!, w: SW, h: SH, kind: "db", label: "Inventory", sub: "own database" },
  },
  wires: {
    u_c: { from: [188, 239], to: [212, 239] },
    c_s0: { from: C_OUT, to: [SX, SY[0]! + SH / 2] },
    c_s1: { from: C_OUT, to: [SX, SY[1]! + SH / 2] },
    c_s2: { from: C_OUT, to: [SX, SY[2]! + SH / 2] },
  },
};
