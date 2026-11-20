import type { Outputs } from "@tintelix/schema";

/**
 * Moves each displayed number a fraction k of the way to its target, so tiles ease instead of jumping.
 * Once a number is within 0.05% of its target it lands on it exactly: easing alone never arrives,
 * and 99.99999999 would read "99.9%" where the model says 100%.
 */
export function smoothToward(display: Outputs, target: Outputs, k: number): void {
  for (const [name, value] of Object.entries(target)) {
    const from = display[name] ?? value;
    const next = from + (value - from) * k;
    // Within 0.05% of the target is close enough to land: the last stretch of easing is invisible
    // anyway, except as a second of "99.9%" on the way to 100%.
    display[name] = Math.abs(value - next) <= 5e-4 * Math.max(1, Math.abs(value)) ? value : next;
  }
}
