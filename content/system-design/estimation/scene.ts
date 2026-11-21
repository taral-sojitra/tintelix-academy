import type { SceneSpec } from "@tintelix/schema";

/**
 * A calculator drawn as boxes: monthly users → daily users → requests a second → busiest hour →
 * cores along the top; daily users → writes → a year → with copies along the bottom; cores → next
 * year on the right. Each arrow's label is set from the model as the inputs change.
 */
const TOP = 64;
const BOT = 282;
const H = 118;
const W = 150;
const X = [16, 212, 408, 604, 800];
const box = (x: number, y: number, kind: "users" | "app" | "services" | "db" | "curve", label: string, sub: string) => ({ x, y, w: W, h: H, kind, label, sub });

export const estimationScene: SceneSpec = {
  kind: "estimate",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 50, w: 984, h: 362 },
  nodes: {
    mau: box(X[0]!, TOP, "users", "Monthly users", "start here"),
    dau: box(X[1]!, TOP, "users", "Daily users", "active today"),
    avg: { ...box(X[2]!, TOP, "app", "Per second", "on average"), hidden: false },
    peak: { ...box(X[3]!, TOP, "app", "Busiest hour", "size for this"), hidden: true },
    cores: { ...box(X[4]!, TOP, "services", "Cores", "to serve it"), hidden: true },
    writes: { ...box(X[1]!, BOT, "db", "Written a day", "new data"), hidden: true },
    year: { ...box(X[2]!, BOT, "db", "A year", "of data"), hidden: true },
    stored: { ...box(X[3]!, BOT, "db", "Stored", "all copies"), hidden: true },
    growth: { ...box(X[4]!, BOT, "curve", "Next year", "after growth"), hidden: true },
  },
  wires: {
    m0: { from: [X[0]! + W, TOP + H / 2], to: [X[1]!, TOP + H / 2], label: "·" },
    m1: { from: [X[1]! + W, TOP + H / 2], to: [X[2]!, TOP + H / 2], label: "·" },
    m2: { from: [X[2]! + W, TOP + H / 2], to: [X[3]!, TOP + H / 2], label: "·" },
    m3: { from: [X[3]! + W, TOP + H / 2], to: [X[4]!, TOP + H / 2], label: "·" },
    s0: { from: [X[1]! + W / 2, TOP + H], to: [X[1]! + W / 2, BOT], label: "·" },
    s1: { from: [X[1]! + W, BOT + H / 2], to: [X[2]!, BOT + H / 2], label: "·" },
    s2: { from: [X[2]! + W, BOT + H / 2], to: [X[3]!, BOT + H / 2], label: "·" },
    g0: { from: [X[4]! + W / 2, TOP + H], to: [X[4]! + W / 2, BOT], label: "·" },
  },
};
