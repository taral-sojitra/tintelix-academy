import { SHOP_TABLES } from "@tintelix/sql/tables";
import { Icon } from "../Icon";

/** The shop's tables and columns, so a learner can check names without guessing. */
export function DatasetCard() {
  return (
    <section className="sql-dataset" aria-labelledby="ds-title">
      <h3 id="ds-title">
        <Icon name="db" />
        The Tintelix Shop
      </h3>
      {SHOP_TABLES.map((t, i) => (
        <details key={t.name} open={i < 2}>
          <summary>
            <code>{t.name}</code>
          </summary>
          <p>{t.blurb}</p>
          <ul>
            {t.columns.map((c) => (
              <li key={c.name}>
                <code>{c.name}</code> <span className="ds-type">{c.type}</span>
                {c.note && <span className="ds-note"> · {c.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
