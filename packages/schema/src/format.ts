import type { Outputs } from "./model";

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function duration(sec: number): string {
  if (sec < 120) return `${Math.round(sec)} s`;
  if (sec < 7200) return `${Math.round(sec / 60)} min`;
  return `${Math.round(sec / 3600)} h`;
}

/**
 * How a model output reads on screen, by its name: *Pct are percentages, p95 and *Ms milliseconds,
 * *Sec durations, *Price rupees; anything else is a plain number.
 */
export function formatOutput(name: string, value: number): string {
  if (name.endsWith("Pct")) {
    // Just under 100% keeps one decimal, rounded down, so 99.99% never reads as a perfect 100%.
    if (value > 99 && value < 100) {
      const tenth = Math.floor(value * 10) / 10;
      return Number.isInteger(tenth) ? `${tenth}%` : `${tenth.toFixed(1)}%`;
    }
    // Small shares keep one decimal, so 9.6% doesn't read as 10% and 0.1% doesn't read as none.
    const tenth = Math.round(value * 10) / 10;
    if (Math.abs(tenth) < 10 && !Number.isInteger(tenth)) return `${tenth.toFixed(1)}%`;
    return `${Math.round(value)}%`;
  }
  if (name === "p95" || name.endsWith("Ms")) {
    // One decimal only for a half (25.5 ms), so a cache hit doesn't read as 26 ms; everything else is whole.
    const tenths = Math.round(value * 10);
    const shown = value < 100 && tenths % 10 === 5 ? (tenths / 10).toFixed(1) : String(Math.round(value));
    return `${shown} ms`;
  }
  if (name.endsWith("Sec")) return duration(value);
  if (name.endsWith("Price")) return `₹${grouped.format(value)}`;
  const tenth = Math.round(value * 10) / 10;
  if (Math.abs(tenth) < 10 && !Number.isInteger(tenth)) return tenth.toFixed(1);
  return grouped.format(value);
}

/** Replaces {name} placeholders with formatted outputs; unknown names stay as they are. */
export function fillOutputs(text: string, outputs: Outputs): string {
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (all, name: string) => (name in outputs ? formatOutput(name, outputs[name]!) : all));
}
