import type { PatternCard as Card } from "@tintelix/schema";
import { Icon } from "../Icon";

const ROWS: [keyof Card, string][] = [
  ["signal", "Signal"],
  ["reachFor", "Reach for"],
  ["askYourself", "Ask yourself"],
  ["whyItWorks", "Why it works"],
  ["trap", "Trap"],
];

/** When to reach for this lesson's pattern: the signal, the tool, the question, why it works and the trap. */
export function PatternCard({ card }: { card: Card }) {
  return (
    <section className="dsa-card" aria-labelledby="dsa-card-h">
      <h3 id="dsa-card-h">
        <Icon name="target" />
        When to reach for it
      </h3>
      <dl>
        {ROWS.map(([k, label]) => (
          <div key={k}>
            <dt>{label}</dt>
            <dd>{card[k]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
