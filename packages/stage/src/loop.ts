/**
 * One requestAnimationFrame loop. It stops while the tab is hidden or the stage is off screen,
 * and starts again when both are false. `tick` receives real seconds since the last frame (capped at 0.05).
 */
export function startLoop(target: Element, tick: (rdt: number) => void): () => void {
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let stopped = false;
  const visible = () => !document.hidden && onScreen && !stopped;
  const frame = (now: number) => {
    raf = 0;
    if (!visible()) return;
    const rdt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    tick(rdt);
    raf = requestAnimationFrame(frame);
  };
  const resume = () => {
    if (visible() && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        resume();
      })
    : null;
  io?.observe(target);
  document.addEventListener("visibilitychange", resume);
  resume();
  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    io?.disconnect();
    document.removeEventListener("visibilitychange", resume);
  };
}
