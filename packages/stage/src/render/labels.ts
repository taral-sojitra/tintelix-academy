/** A rectangle in stage pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 3;

const hits = (a: Box, b: Box) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;

/**
 * Where to move a floating label so it covers no box, overlay or other label: the offset to the nearest
 * clear spot within a short reach, trying small moves before big ones and up/down before sideways.
 * Returns null when nothing nearby is clear; the caller then drops the label or keeps it where it was.
 */
export function placeLabel(label: Box, obstacles: Box[], stage: Box): { dx: number; dy: number } | null {
  const stepY = label.h + GAP;
  const stepX = Math.max(24, label.w / 2);
  const tries: { dx: number; dy: number; cost: number }[] = [];
  for (let iy = -6; iy <= 6; iy++) {
    for (let ix = -3; ix <= 3; ix++) {
      const dx = ix * stepX;
      const dy = iy * stepY;
      tries.push({ dx, dy, cost: Math.abs(dx) * 1.4 + Math.abs(dy) });
    }
  }
  tries.sort((a, b) => a.cost - b.cost);
  for (const t of tries) {
    // Keep the label on the stage: nudge it in from the edges first.
    const x = Math.max(stage.x + 4, Math.min(label.x + t.dx, stage.x + stage.w - label.w - 4));
    const y = Math.max(stage.y + 2, Math.min(label.y + t.dy, stage.y + stage.h - label.h - 2));
    const at: Box = { x, y, w: label.w, h: label.h };
    if (!obstacles.some((o) => hits(at, o))) return { dx: x - label.x, dy: y - label.y };
  }
  return null;
}
