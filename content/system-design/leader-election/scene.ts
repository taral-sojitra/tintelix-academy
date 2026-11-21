import type { SceneSpec } from "@tintelix/schema";

const W = 150;
const H = 84;
/** Five servers on an ellipse, n1 at the top, going clockwise. */
const CENTERS: Record<string, [number, number]> = { n1: [400, 90], n2: [609, 201], n3: [529, 379], n4: [271, 379], n5: [191, 201] };
const STORAGE = { x: 760, y: 30, w: 220, h: 196 };

/** Where the line from a box's centre towards `to` leaves a w × h box. */
function edge(c: [number, number], to: [number, number], w = W, h = H): [number, number] {
  const dx = to[0] - c[0];
  const dy = to[1] - c[1];
  const s = Math.min(w / 2 / Math.max(Math.abs(dx), 1e-9), h / 2 / Math.max(Math.abs(dy), 1e-9));
  return [Math.round(c[0] + dx * s), Math.round(c[1] + dy * s)];
}

const server = (id: string) => ({ x: CENTERS[id]![0] - W / 2, y: CENTERS[id]![1] - H / 2, w: W, h: H, kind: "app" as const, label: id, sub: "follower" });
const wires: SceneSpec["wires"] = {};
for (let a = 1; a <= 5; a++) {
  for (let b = a + 1; b <= 5; b++) {
    const ca = CENTERS[`n${a}`]!;
    const cb = CENTERS[`n${b}`]!;
    wires[`n${a}_n${b}`] = { from: edge(ca, cb), to: edge(cb, ca), straight: true };
  }
}
const storageCenter: [number, number] = [STORAGE.x + STORAGE.w / 2, STORAGE.y + STORAGE.h / 2];
for (const id of ["n1", "n2"]) wires[`${id}_st`] = { from: edge(CENTERS[id]!, storageCenter), to: edge(storageCenter, CENTERS[id]!, STORAGE.w, STORAGE.h), straight: true };

/** Five servers wired to each other, a votes panel, and storage that checks fencing tokens (step 4). */
export const leaderScene: SceneSpec = {
  kind: "leader",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 408 },
  nodes: {
    n1: server("n1"),
    n2: server("n2"),
    n3: server("n3"),
    n4: server("n4"),
    n5: server("n5"),
    tally: { x: 720, y: 250, w: 260, h: 160, kind: "curve", label: "Votes", sub: "a majority is 3 of 5" },
    storage: { ...STORAGE, kind: "db", label: "Storage", sub: "checks each token", hidden: true },
  },
  wires,
};
