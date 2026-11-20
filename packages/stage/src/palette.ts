import type { Hue } from "./sim";

export type PaletteKey = Hue | "blue" | "white";
export interface Palette {
  colors: Record<PaletteKey, string>;
  /** Dark stages glow (additive blending); light stages draw plain. */
  dark: boolean;
}

const FALLBACK: Palette = {
  colors: { cyan: "#38d4f0", green: "#2fcf8f", amber: "#f6b93b", violet: "#9b87f5", red: "#f26d6d", blue: "#5b8ce0", white: "#ffffff" },
  dark: true,
};

/** Reads the theme's stage colours from CSS custom properties on `el`. */
export function readPalette(el: Element): Palette {
  if (typeof getComputedStyle !== "function") return FALLBACK;
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const dark = v("--stage-mode", "dark") !== "light";
  return {
    dark,
    colors: {
      cyan: v("--cyan", FALLBACK.colors.cyan),
      green: v("--green", FALLBACK.colors.green),
      amber: v("--amber", FALLBACK.colors.amber),
      violet: v("--violet", FALLBACK.colors.violet),
      red: v("--red", FALLBACK.colors.red),
      blue: v("--blue", FALLBACK.colors.blue),
      white: dark ? "#ffffff" : v("--ink", "#2b2118"),
    },
  };
}

/** `#rrggbb` (or `#rgb`) with alpha, as an rgba() string. Other colour forms pass through unchanged. */
export function withAlpha(color: string, a: number): string {
  let hex = color.trim();
  if (!hex.startsWith("#")) return color;
  if (hex.length === 4) hex = "#" + [...hex.slice(1)].map((c) => c + c).join("");
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
