import type { Outputs } from "./model";

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** How a model output reads on screen: names ending in Pct are percentages, p95 and *Ms are milliseconds. */
export function formatOutput(name: string, value: number): string {
  if (name.endsWith("Pct")) return `${Math.round(value)}%`;
  if (name === "p95" || name.endsWith("Ms")) {
    // One decimal only for a half (25.5 ms), so a cache hit doesn't read as 26 ms; everything else is whole.
    const tenths = Math.round(value * 10);
    const shown = value < 100 && tenths % 10 === 5 ? (tenths / 10).toFixed(1) : String(Math.round(value));
    return `${shown} ms`;
  }
  return grouped.format(value);
}

/** Replaces {name} placeholders with formatted outputs; unknown names stay as they are. */
export function fillOutputs(text: string, outputs: Outputs): string {
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (all, name: string) => (name in outputs ? formatOutput(name, outputs[name]!) : all));
}
