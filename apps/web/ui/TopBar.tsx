"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconName } from "@tintelix/stage";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

type Tab = { label: string; icon: IconName; href?: string; match?: (p: string) => boolean };

const TABS: Tab[] = [
  { label: "Learn", icon: "learn", href: "/", match: (p) => p === "/" || (/^\/[a-z-]+(\/[a-z0-9-]+)?$/.test(p) && !p.startsWith("/components") && !p.endsWith("/cheatsheet")) },
  { label: "Practice", icon: "practice" },
  { label: "Design Lab", icon: "lab" },
  { label: "Components", icon: "blocks", href: "/components", match: (p) => p.startsWith("/components") },
  { label: "Cheatsheets", icon: "sheet", href: "/system-design/caching/cheatsheet", match: (p) => p.endsWith("/cheatsheet") },
];

export function TopBar() {
  const path = usePathname() ?? "/";
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Tintelix home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 7.5L12 16.5L18 7.5" />
            <circle cx="6" cy="6" r="2.4" fill="#fff" stroke="none" />
            <circle cx="18" cy="6" r="2.4" fill="#fff" stroke="none" />
            <circle cx="12" cy="18" r="2.4" fill="#fff" stroke="none" />
          </svg>
        </span>
        Tintelix
      </Link>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) =>
          t.href ? (
            <Link key={t.label} href={t.href} className={`tab${t.match?.(path) ? " on" : ""}`} aria-current={t.match?.(path) ? "page" : undefined}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </Link>
          ) : (
            <span key={t.label} className="tab soon" aria-disabled="true" title="Coming in Phase 2 and 3">
              <Icon name={t.icon} />
              <span>{t.label}</span>
              <em>Soon</em>
            </span>
          ),
        )}
      </nav>
      <div className="top-right">
        <ThemeToggle />
      </div>
    </header>
  );
}
