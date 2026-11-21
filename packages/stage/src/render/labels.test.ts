import { placeLabel, type Box } from "./labels";

const stage: Box = { x: 0, y: 0, w: 600, h: 400 };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("placeLabel", () => {
  it("keeps a label where it was asked for when nothing is in the way", () => {
    expect(placeLabel({ x: 100, y: 100, w: 80, h: 20 }, [], stage)).toEqual({ dx: 0, dy: 0 });
  });

  it("moves a label off a box, to the nearest clear spot", () => {
    const box: Box = { x: 80, y: 80, w: 160, h: 80 };
    const label: Box = { x: 100, y: 100, w: 80, h: 20 };
    const at = placeLabel(label, [box], stage)!;
    const moved = { ...label, x: label.x + at.dx, y: label.y + at.dy };
    expect(overlaps(moved, box)).toBe(false);
    expect(Math.abs(at.dx) + Math.abs(at.dy)).toBeLessThan(120);
  });

  it("stays inside the stage", () => {
    const at = placeLabel({ x: 560, y: 2, w: 80, h: 20 }, [], stage)!;
    expect(560 + at.dx + 80).toBeLessThanOrEqual(600);
    expect(2 + at.dy).toBeGreaterThanOrEqual(0);
  });

  it("gives up (null) when there is no clear spot nearby", () => {
    expect(placeLabel({ x: 100, y: 100, w: 80, h: 20 }, [{ x: 0, y: 0, w: 600, h: 400 }], stage)).toBeNull();
  });
});
