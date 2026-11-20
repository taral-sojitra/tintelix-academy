import { DEFAULT_THEME, type ThemeName } from "@tintelix/theme";

export const THEME_KEY = "tintelix-theme";

/** Runs before first paint, so a saved theme never flashes the default one. Kept tiny and dependency-free. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t&&t!=="${DEFAULT_THEME}")document.documentElement.dataset.theme=t}catch(e){}`;

export function applyTheme(theme: ThemeName): void {
  if (theme === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

export function currentTheme(): ThemeName {
  return (document.documentElement.dataset.theme as ThemeName | undefined) ?? DEFAULT_THEME;
}
