import type { Metadata } from "next";
import { components, lessons } from "@tintelix/content";
import { ComponentBrowser } from "../../ui/ComponentBrowser";

export const metadata: Metadata = { title: "Components" };

export default function ComponentsPage() {
  const usedIn: Record<string, { href: string; title: string }[]> = {};
  for (const l of lessons) for (const c of l.components) (usedIn[c] ??= []).push({ href: `/${l.home}/${l.slug}`, title: l.title });
  return (
    <main className="page">
      <header className="page-head">
        <h1>Components</h1>
        <p className="lead">The building blocks lessons use, one card each: what it does, when to reach for it, what bites, and numbers worth remembering. Numbers are rough, for back-of-the-envelope sums.</p>
      </header>
      <ComponentBrowser components={components} usedIn={usedIn} />
    </main>
  );
}
