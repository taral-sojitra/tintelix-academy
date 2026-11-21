import { cdnScene } from "../../../content/system-design/cdn/scene";
import { fitView, panView } from "./camera";

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

  it("fits the CDN diagram in a 390 × 300 stage, regions included", () => {
    const v = fitView({ w: 390, h: 300 }, cdnScene.bounds, insets);
    const boxes = [...Object.values(cdnScene.nodes), ...(cdnScene.regions ?? [])];
    for (const b of boxes) {
      for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y + b.h]] as const) {
        expect(x * v.s + v.ox).toBeGreaterThanOrEqual(0);
        expect(x * v.s + v.ox).toBeLessThanOrEqual(390);
        expect(y * v.s + v.oy).toBeGreaterThanOrEqual(0);
        expect(y * v.s + v.oy).toBeLessThanOrEqual(300);
      }
    }
  });

  it("never returns a zero or negative scale on a tiny stage", () => {
    expect(fitView({ w: 40, h: 40 }, bounds, insets).s).toBeGreaterThan(0);
  });
});

describe("panView", () => {
  const bounds = { x: 0, y: 0, w: 1000, h: 400 };
  const insets = { top: 50, side: 14, bottom: 56 };
  const phone = { w: 366, h: 400 };

  it("never shrinks below the minimum scale on a narrow stage", () => {
    expect(panView(phone, bounds, insets, 0.7, [500, 200]).s).toBe(0.7);
  });

  it("puts the requested point in the middle of the stage", () => {
    const v = panView(phone, bounds, insets, 0.7, [500, 200]);
    expect(500 * v.s + v.ox).toBeCloseTo(14 + (366 - 28) / 2, 6);
  });

  it("stops at the diagram's edges instead of showing empty space", () => {
    const left = panView(phone, bounds, insets, 0.7, [0, 200]);
    expect(left.ox).toBeCloseTo(14, 6);
    const right = panView(phone, bounds, insets, 0.7, [1000, 200]);
    expect(1000 * right.s + right.ox).toBeCloseTo(366 - 14, 6);
  });

  it("is the plain fit when the diagram already fits at a readable size", () => {
    const wide = { w: 1400, h: 700 };
    expect(panView(wide, bounds, insets, 0.7, [0, 0])).toEqual(fitView(wide, bounds, insets));
  });
});
