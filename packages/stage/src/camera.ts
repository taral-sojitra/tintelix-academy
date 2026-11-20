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
