import type { SceneSpec } from "@tintelix/schema";

/**
 * Three groups of users → balancer → three servers, each holding one group's sessions in memory;
 * step 4 adds a shared session store every server reads.
 */
const SX = 430;
const SW = 270;
const SH = 100;
const SY = [40, 168, 296];
const LB_OUT: [number, number] = [368, 228];
const STORE_IN: [number, number] = [760, 218];

export const sessionScene: SceneSpec = {
  kind: "session",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 32, w: 984, h: 380 },
  nodes: {
    users: { x: 16, y: 188, w: 156, h: 80, kind: "users", label: "Users", sub: "A, B and C" },
    lb: { x: 200, y: 182, w: 168, h: 92, kind: "lb", label: "Balancer", sub: "picks a server" },
    s0: { x: SX, y: SY[0]!, w: SW, h: SH, kind: "app", label: "Server A", sub: "app server" },
    s1: { x: SX, y: SY[1]!, w: SW, h: SH, kind: "app", label: "Server B", sub: "app server" },
    s2: { x: SX, y: SY[2]!, w: SW, h: SH, kind: "app", label: "Server C", sub: "app server" },
    store: { x: 760, y: 160, w: 224, h: 116, kind: "cache", label: "Session store", sub: "Redis", hidden: true },
  },
  wires: {
    u_lb: { from: [172, 228], to: [200, 228] },
    lb_s0: { from: LB_OUT, to: [SX, SY[0]! + SH / 2] },
    lb_s1: { from: LB_OUT, to: [SX, SY[1]! + SH / 2] },
    lb_s2: { from: LB_OUT, to: [SX, SY[2]! + SH / 2] },
    s0_st: { from: [SX + SW, SY[0]! + SH / 2], to: STORE_IN },
    s1_st: { from: [SX + SW, SY[1]! + SH / 2], to: STORE_IN },
    s2_st: { from: [SX + SW, SY[2]! + SH / 2], to: STORE_IN },
  },
};
