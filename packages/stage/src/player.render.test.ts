// @vitest-environment jsdom
import { caching } from "../../../content/system-design/caching/lesson";
import { createPlayer } from "./player";
import { rng } from "./rng";

/** jsdom has no canvas, layout or ResizeObserver: give the player just enough of each. */
function stage(width: number, height: number) {
  const noop = new Proxy({}, { get: (_t, k) => (k === "createRadialGradient" || k === "createLinearGradient" ? () => ({ addColorStop() {} }) : k === "measureText" ? () => ({ width: 40 }) : () => {}), set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => noop) as never;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} } as never;
  Element.prototype.getBoundingClientRect = function () {
    const full = (this as HTMLElement).classList?.contains("tx-stage");
    return { x: 0, y: 0, left: 0, top: 0, width: full ? width : 0, height: full ? height : 0, right: full ? width : 0, bottom: full ? height : 0, toJSON() {} } as DOMRect;
  };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const p = createPlayer(caching, host, { rand: rng(3), reducedMotion: true });
  const world = host.querySelector<HTMLElement>(".tx-world")!;
  const root = host.querySelector<HTMLElement>(".tx-stage")!;
  const scale = () => Number(/scale\(([\d.]+)\)/.exec(world.style.transform)![1]);
  const x = () => Number(/translate\((-?[\d.]+)px/.exec(world.style.transform)![1]);
  return { p, host, root, scale, x, zoom: host.querySelector<HTMLButtonElement>(".tx-zoom")! };
}

describe("player on a phone-width stage", () => {
  it("keeps the diagram readable and pans; the button shows the whole diagram", () => {
    const { p, root, scale, zoom } = stage(366, 420);
    expect(scale()).toBe(0.7);
    expect(root.classList.contains("tx-zoomed")).toBe(true);
    expect(zoom.textContent).toBe("Whole diagram");
    zoom.click();
    expect(scale()).toBeLessThan(0.4);
    expect(zoom.textContent).toBe("Zoom in");
    p.destroy();
  });

  it("dragging sideways moves the view", () => {
    const { p, root, x } = stage(366, 420);
    const before = x();
    root.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, clientX: 300, clientY: 200, bubbles: true }));
    root.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 100, clientY: 200, bubbles: true }));
    expect(x()).toBeLessThan(before);
    expect(root.classList.contains("tx-dragged")).toBe(true);
    p.destroy();
  });

  it("a desktop-width stage fits the whole diagram with no zoom control", () => {
    const { p, root, scale } = stage(1100, 560);
    expect(scale()).toBeGreaterThan(0.7);
    expect(root.classList.contains("tx-narrow")).toBe(false);
    p.destroy();
  });
});
