import { fitView } from "./camera";

const bounds = { x: 8, y: 62, w: 896, h: 422 };
const insets = { top: 50, side: 14, bottom: 56 };
const corners = (v: { s: number; ox: number; oy: number }) => [
  [bounds.x * v.s + v.ox, bounds.y * v.s + v.oy],
  [(bounds.x + bounds.w) * v.s + v.ox, (bounds.y + bounds.h) * v.s + v.oy],
];

describe("fitView", () => {
  it("keeps the whole diagram inside the space the labels and controls leave free", () => {
    const v = fitView({ w: 1200, h: 600 }, bounds, insets);
    const [[x0, y0], [x1, y1]] = corners(v) as [[number, number], [number, number]];
    expect(x0).toBeGreaterThanOrEqual(insets.side - 1e-9);
    expect(x1).toBeLessThanOrEqual(1200 - insets.side + 1e-9);
    expect(y0).toBeGreaterThanOrEqual(insets.top - 1e-9);
    expect(y1).toBeLessThanOrEqual(600 - insets.bottom + 1e-9);
  });

  it("centres the diagram in the free space", () => {
    const v = fitView({ w: 1200, h: 600 }, bounds, insets);
    const [[x0], [x1]] = corners(v) as [[number, number], [number, number]];
    expect(x0 - insets.side).toBeCloseTo(1200 - insets.side - x1, 6);
  });

  it("on a phone-width stage (390 × 300) every node stays inside the stage", () => {
    const v = fitView({ w: 390, h: 300 }, bounds, insets);
    for (const [x, y] of corners(v) as [number, number][]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(390);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
  });

  it("never returns a zero or negative scale on a tiny stage", () => {
    expect(fitView({ w: 40, h: 40 }, bounds, insets).s).toBeGreaterThan(0);
  });
});
