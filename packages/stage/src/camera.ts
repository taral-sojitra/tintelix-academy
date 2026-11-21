export interface View {
  s: number;
  ox: number;
  oy: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Scale and offset that fit `bounds` (world units) into the stage minus the insets left for labels and controls.
 * The diagram is centred and never cropped; focus is shown by dimming, never by zooming.
 */
export function fitView(stage: { w: number; h: number }, bounds: Rect, insets: { top: number; side: number; bottom: number }): View {
  const aw = Math.max(1, stage.w - insets.side * 2);
  const ah = Math.max(1, stage.h - insets.top - insets.bottom);
  const s = Math.max(1e-3, Math.min(aw / bounds.w, ah / bounds.h));
  return {
    s,
    ox: insets.side + (aw - bounds.w * s) / 2 - bounds.x * s,
    oy: insets.top + (ah - bounds.h * s) / 2 - bounds.y * s,
  };
}

/**
 * A view that never drops below `minScale`, for stages too narrow to show the whole diagram readably.
 * The diagram is then wider (or taller) than the stage: `center` (world units) sits in the middle of the
 * free space, clamped so the diagram's edges never pull in past the stage's. When the plain fit is already
 * at least `minScale`, this is the plain fit.
 */
export function panView(stage: { w: number; h: number }, bounds: Rect, insets: { top: number; side: number; bottom: number }, minScale: number, center: [number, number]): View {
  const fit = fitView(stage, bounds, insets);
  if (fit.s >= minScale) return fit;
  const s = minScale;
  const aw = Math.max(1, stage.w - insets.side * 2);
  const ah = Math.max(1, stage.h - insets.top - insets.bottom);
  const axis = (start: number, avail: number, lo: number, size: number, c: number) => {
    if (size * s <= avail) return start + (avail - size * s) / 2 - lo * s;
    const o = start + avail / 2 - c * s;
    return Math.min(start - lo * s, Math.max(start + avail - (lo + size) * s, o));
  };
  return { s, ox: axis(insets.side, aw, bounds.x, bounds.w, center[0]), oy: axis(insets.top, ah, bounds.y, bounds.h, center[1]) };
}
