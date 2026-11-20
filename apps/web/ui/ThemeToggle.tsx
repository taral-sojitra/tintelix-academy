"use client";

import { useEffect, useState } from "react";
import type { ThemeName } from "@tintelix/theme";
import { Icon } from "./Icon";
import { applyTheme, currentTheme } from "./theme";

const NEXT: Record<ThemeName, ThemeName> = { warm: "blueprint", blueprint: "warm" };
const LABEL: Record<ThemeName, string> = { warm: "Warm", blueprint: "Blueprint" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  useEffect(() => setTheme(currentTheme()), []);
  const shown = theme ?? "warm";
  return (
    <button
      type="button"
      className="btn ghost theme-toggle"
      onClick={() => {
        const next = NEXT[shown];
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={`Theme: ${LABEL[shown]}. Switch to ${LABEL[NEXT[shown]]}`}
      title={`Switch to ${LABEL[NEXT[shown]]}`}
    >
      <Icon name={shown === "warm" ? "sun" : "moon"} />
      <span>{LABEL[shown]}</span>
    </button>
  );
}
