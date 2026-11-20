"use client";

import { useState } from "react";
import type { Component } from "@tintelix/schema";
import { CATEGORY_LABEL, ComponentCard } from "./ComponentCard";

export function ComponentBrowser({ components, usedIn }: { components: Component[]; usedIn: Record<string, { href: string; title: string }[]> }) {
  const categories = [...new Set(components.map((c) => c.category))];
  const [filter, setFilter] = useState<Component["category"] | "all">("all");
  const shown = filter === "all" ? components : components.filter((c) => c.category === filter);
  return (
    <>
      <div className="filters" role="group" aria-label="Filter by category">
        {(["all", ...categories] as const).map((c) => (
          <button key={c} type="button" className={`pill${filter === c ? " on" : ""}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {c === "all" ? `All · ${components.length}` : `${CATEGORY_LABEL[c]} · ${components.filter((x) => x.category === c).length}`}
          </button>
        ))}
      </div>
      <div className="comp-grid">
        {shown.map((c) => (
          <ComponentCard key={c.id} component={c} usedIn={usedIn[c.id] ?? []} />
        ))}
      </div>
    </>
  );
}
