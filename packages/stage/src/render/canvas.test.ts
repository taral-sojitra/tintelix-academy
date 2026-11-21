import type { Palette } from "../palette";
import type { Packet } from "../sim";
import type { Float } from "../effects";
import { drawBack, drawFront, fitLabelX, type Surface } from "./canvas";

const pal: Palette = { colors: { cyan: "#38d4f0", green: "#2fcf8f", amber: "#f6b93b", violet: "#9b87f5", red: "#f26d6d", blue: "#5b8ce0", white: "#ffffff" }, dark: false };
const view = { s: 1, ox: 0, oy: 0 };

/** A canvas context that records the circles drawn on it. */
function surface(): Surface & { arcs: number[]; pills: number[][] } {
  const arcs: number[] = [];
  const pills: number[][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, k) {
      if (k === "arc") return (_x: number, _y: number, r: number) => arcs.push(r);
      if (k === "roundRect") return (x: number, y: number, w: number, h: number) => pills.push([x, y, w, h]);
      if (k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "measureText") return () => ({ width: 40 });
      return () => {};
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, dpr: 1, w: 400, h: 300, arcs, pills };
}

const packet = (small = false): Packet => ({ id: 1, lane: 0, route: [], leg: 0, s: 0, x: 50, y: 50, color: "cyan", kind: "req", small, hidden: false, dead: false, inNode: false, wait: 0, trail: [] });

describe("canvas layers", () => {
  it("draws moving requests on the back layer, under the boxes", () => {
    const back = surface();
    drawBack(back, view, {}, [], [], pal, 0, [packet(), packet(true)]);
    expect(back.arcs).toContain(4.3);
    expect(back.arcs).toContain(2.7);
  });

  it("keeps the front layer, above the boxes, free of requests", () => {
    const front = surface();
    drawFront(front, view, null, [], pal);
    expect(front.arcs).not.toContain(4.3);
  });

  it("moves a floating label off the box it would cover", () => {
    const front = surface();
    const box = { x: 40, y: 40, w: 160, h: 80 };
    const float: Float = { x: 60, y: 80, text: "✓ HIT", color: "green", big: false, life: 1, max: 1.15 };
    drawFront(front, view, null, [float], pal, () => [box]);
    const [x = 0, y = 0, w = 0, h = 0] = front.pills[0]!;
    const clear = x >= box.x + box.w || x + w <= box.x || y >= box.y + box.h || y + h <= box.y;
    expect(clear).toBe(true);
  });

  it("skips a small label when there is no clear spot, but always shows a big one", () => {
    const front = surface();
    const everywhere = () => [{ x: 0, y: 0, w: 400, h: 300 }];
    drawFront(front, view, null, [{ x: 60, y: 80, text: "2 ms", color: "cyan", big: false, life: 1, max: 1.15 }], pal, everywhere);
    expect(front.pills).toHaveLength(0);
    drawFront(front, view, null, [{ x: 60, y: 80, text: "ALL KEYS EXPIRED", color: "red", big: true, life: 1, max: 1.8 }], pal, everywhere);
    expect(front.pills).toHaveLength(1);
  });
});

describe("fitLabelX", () => {
  it("pulls a label that would run off the right edge back inside the stage (ALL KEYS EXPIRED on a phone)", () => {
    const x = fitLabelX(271, 145, 366);
    expect(x + 145).toBeLessThanOrEqual(366 - 6);
  });

  it("keeps a label off the left edge", () => {
    expect(fitLabelX(-10, 50, 366)).toBe(6);
  });

  it("leaves a label that already fits where it is", () => {
    expect(fitLabelX(100, 50, 366)).toBe(100);
  });
});
