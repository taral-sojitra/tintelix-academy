"use client";

import { useEffect, useRef } from "react";
import type { Listing } from "@tintelix/dsa";

export type Lang = "ts" | "py";
const LANGS: { id: Lang; label: string }[] = [
  { id: "ts", label: "TypeScript" },
  { id: "py", label: "Python" },
];

/** The listing with the line that just ran lit, and a TypeScript | Python toggle. */
export function CodePanel({ listing, lit, lang, onLang }: { listing: Listing; lit: number[]; lang: Lang; onLang: (l: Lang) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const line = ref.current?.querySelector<HTMLElement>("li.lit");
    const box = ref.current?.parentElement;
    if (line && box) box.scrollTop = Math.max(0, line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2);
  }, [lit, lang]);
  return (
    <section className="dsa-code" aria-label="Code">
      <div className="dsa-code-head">
        <span className="eyebrow">Code</span>
        <div className="seg" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l.id} type="button" className={lang === l.id ? "on" : ""} aria-pressed={lang === l.id} onClick={() => onLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dsa-code-body">
        <ol ref={ref}>
          {listing.lines.map((line, i) => {
            const on = lit.includes(i + 1);
            return (
              <li key={i} className={on ? "lit" : undefined} aria-current={on ? "true" : undefined}>
                <code>{line || " "}</code>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
