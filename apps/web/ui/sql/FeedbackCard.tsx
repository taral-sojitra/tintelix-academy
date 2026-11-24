import type { Feedback } from "@tintelix/sql";
import { Icon } from "../Icon";
import { Cell } from "./ResultTable";

const TITLE = { error: "Postgres stopped", kind: "Not this kind of statement", columns: "Check the columns", rows: "Check the rows", order: "Check the order" } as const;

function Rows({ label, rows }: { label: string; rows: unknown[][] }) {
  if (!rows.length) return null;
  return (
    <div className="fb-rows">
      <span className="eyebrow">{label}</span>
      <table className="sql-table">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>
                  <Cell value={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What the last run got right or wrong, in plain words. */
export function FeedbackCard({ feedback, onNext, nextLabel = "Next task" }: { feedback: Feedback | null; onNext?: () => void; nextLabel?: string }) {
  if (!feedback) {
    return (
      <section className="fb fb-idle" aria-live="polite">
        <p>
          Run the query to check it. <kbd>Ctrl</kbd> + <kbd>Enter</kbd> runs it from the editor.
        </p>
      </section>
    );
  }
  if (feedback.ok) {
    return (
      <section className="fb fb-ok" aria-live="polite">
        <h3>
          <Icon name="checkCircle" />
          Task solved
        </h3>
        {onNext && (
          <button type="button" className="btn primary" onClick={onNext}>
            {nextLabel}
            <Icon name="arrowRight" />
          </button>
        )}
      </section>
    );
  }
  return (
    <section className={`fb ${feedback.kind === "error" ? "fb-error" : "fb-warn"}`} aria-live="polite">
      <h3>
        <Icon name="alert" />
        {TITLE[feedback.kind]}
      </h3>
      <p>{feedback.message}</p>
      <Rows label="Missing" rows={feedback.missing ?? []} />
      <Rows label="Shouldn't be there" rows={feedback.extra ?? []} />
    </section>
  );
}
