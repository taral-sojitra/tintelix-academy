import type { SceneSpec } from "@tintelix/schema";

/** App → primary (writes) and → up to three read replicas; the primary streams changes to each. */
const RX = 610;
const RW = 240;
const RH = 92;
const RY = [134, 234, 334];
const APP_OUT: [number, number] = [212, 252];

export const replScene: SceneSpec = {
  kind: "repl",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 400 },
  nodes: {
    app: { x: 16, y: 206, w: 196, h: 90, kind: "app", label: "Shop app", sub: "reads and writes" },
    primary: { x: 300, y: 34, w: 230, h: 104, kind: "db", label: "Primary", sub: "takes every write" },
    r0: { x: RX, y: RY[0]!, w: RW, h: RH, kind: "db", label: "Replica 1", sub: "serves reads" },
    r1: { x: RX, y: RY[1]!, w: RW, h: RH, kind: "db", label: "Replica 2", sub: "serves reads" },
    r2: { x: RX, y: RY[2]!, w: RW, h: RH, kind: "db", label: "Replica 3", sub: "serves reads" },
  },
  wires: {
    a_p: { from: [212, 232], to: [300, 96] },
    a_r0: { from: APP_OUT, to: [RX, RY[0]! + RH / 2] },
    a_r1: { from: APP_OUT, to: [RX, RY[1]! + RH / 2] },
    a_r2: { from: APP_OUT, to: [RX, RY[2]! + RH / 2] },
    p_r0: { from: [530, 86], to: [RX + 60, RY[0]!], label: "replication" },
    p_r1: { from: [530, 86], to: [RX + RW, RY[1]! + 10] },
    p_r2: { from: [530, 86], to: [RX + RW, RY[2]! + 10] },
  },
};
