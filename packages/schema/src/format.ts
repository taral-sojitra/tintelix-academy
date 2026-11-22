import type { Outputs } from "./model";

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Availability in %, shown down to the first digit that isn't a nine and rounded down, so 99.9995% never reads as 99.9%. */
function availability(pct: number): string {
  const down = 100 - pct;
  if (down <= 0) return "100%";
  if (down >= 1) {
    const tenth = Math.floor(pct * 10 + 1e-9) / 10;
    return Number.isInteger(tenth) ? `${tenth}%` : `${tenth.toFixed(1)}%`;
  }
  const decimals = Math.min(8, Math.ceil(-Math.log10(down) - 1e-9));
  const f = 10 ** decimals;
  return `${(Math.floor(pct * f + 1e-6) / f).toFixed(decimals)}%`;
}

/** Downtime in seconds: "13 s", "43.8 min", "3 h 39 min", "3.7 days". */
function downtime(sec: number): string {
  if (sec < 120) return `${Math.round(sec)} s`;
  const min = sec / 60;
  if (min < 60) {
    const tenth = Math.round(min * 10) / 10;
    return Number.isInteger(tenth) ? `${tenth} min` : `${tenth.toFixed(1)} min`;
  }
  if (sec < 48 * 3600) {
    let h = Math.floor(sec / 3600);
    let m = Math.round((sec - h * 3600) / 60);
    if (m === 60) {
      h += 1;
      m = 0;
    }
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  const days = Math.round((sec / 86400) * 10) / 10;
  return Number.isInteger(days) ? `${days} days` : `${days.toFixed(1)} days`;
}

function duration(sec: number): string {
  if (sec < 120) return `${Math.round(sec)} s`;
  if (sec < 7200) return `${Math.round(sec / 60)} min`;
  return `${Math.round(sec / 3600)} h`;
}

/**
 * How a model output reads on screen, by its name: *Avail are availabilities in %, *Downtime are
 * downtimes in seconds, *Pct are percentages, p95 and *Ms milliseconds, *Sec durations, *Price
 * rupees; anything else is a plain number.
 */
export function formatOutput(name: string, value: number): string {
  if (name.endsWith("Avail")) return availability(value);
  if (name.endsWith("Downtime")) return downtime(value);
  if (name.endsWith("Pct")) {
    // Just under 100% keeps one decimal, rounded down, so 99.99% never reads as a perfect 100%.
    if (value > 99 && value < 100) {
      const tenth = Math.floor(value * 10) / 10;
      return Number.isInteger(tenth) ? `${tenth}%` : `${tenth.toFixed(1)}%`;
    }
    // Shares under 1% keep up to two decimals, so 0.05% doesn't read as 0.1%.
    if (Math.abs(value) < 1 && value !== 0) {
      const hundredth = Math.round(value * 100) / 100;
      if (!Number.isInteger(Math.round(hundredth * 10 * 1e6) / 1e6)) return `${hundredth.toFixed(2)}%`;
    }
    // Small shares keep one decimal, so 9.6% doesn't read as 10% and 0.1% doesn't read as none.
    const tenth = Math.round(value * 10) / 10;
    if (Math.abs(tenth) < 10 && !Number.isInteger(tenth)) return `${tenth.toFixed(1)}%`;
    return `${grouped.format(Math.round(value))}%`;
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
