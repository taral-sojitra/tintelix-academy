import type { Component } from "@tintelix/schema";
import { Icon } from "./Icon";
import type { IconName } from "@tintelix/stage";

export const CATEGORY_LABEL: Record<Component["category"], string> = {
  traffic: "Traffic",
  storage: "Storage",
  messaging: "Messaging",
  compute: "Compute",
  reliability: "Reliability",
  security: "Security",
};

const ICON: Record<string, IconName> = { users: "users", lb: "lb", server: "server", bolt: "bolt", db: "db" };

/** One building block: what it does, when to use it, what to watch, rough numbers and common tools. */
export function ComponentCard({ component: c, usedIn = [] }: { component: Component; usedIn?: { href: string; title: string }[] }) {
  return (
    <article className={`comp cat-${c.category}`} id={c.id}>
      <header className="comp-head">
        <span className={`comp-icon cat-${c.category}`}>
          <Icon name={ICON[c.icon] ?? "blocks"} />
        </span>
        <div>
          <h3>{c.name}</h3>
          <span className="comp-cat">{CATEGORY_LABEL[c.category]}</span>
        </div>
      </header>
      <p className="comp-one">{c.oneLine}</p>
      <div className="comp-cols">
        <section>
          <h4>Use when</h4>
          <ul>
            {c.useWhen.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4>Watch out</h4>
          <ul className="warn">
            {c.watchOut.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      </div>
      {c.numbers.length > 0 && (
        <dl className="comp-nums">
          {c.numbers.map((n) => (
            <div key={n.label}>
              <dt>{n.label}</dt>
              <dd>{n.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <footer className="comp-foot">
        <ul className="chips" aria-label="Common tools">
          {c.tools.map((t) => (
            <li key={t} className="chip">
              {t}
            </li>
          ))}
        </ul>
        {usedIn.length > 0 && (
          <p className="comp-used">
            In lessons:{" "}
            {usedIn.map((u, i) => (
              <span key={u.href}>
                {i > 0 && ", "}
                <a href={u.href}>{u.title}</a>
              </span>
            ))}
          </p>
        )}
      </footer>
    </article>
  );
}
