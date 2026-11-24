import type { SqlTask } from "@tintelix/schema";
import { compareResults, minus, type Feedback } from "./compare";
import type { Db } from "./db";
import { hasTransactionControl, runInRollback, statementKinds, type RunOutcome } from "./run";

/** Statements that change data or tables; a reading task refuses these. Anything else (typos included) goes to Postgres. */
const WRITE = new Set(["INSERT", "UPDATE", "DELETE", "MERGE", "CREATE", "ALTER", "DROP", "TRUNCATE", "GRANT", "REVOKE", "COPY", "VACUUM", "REINDEX", "CLUSTER", "COMMENT", "SECURITY", "REFRESH", "LOCK"]);

export interface Checked {
  run: RunOutcome;
  feedback: Feedback;
}


/** Runs the learner's SQL for a task and says whether it's right, and if not, what's wrong. */
export async function checkSqlTask(db: Db, task: SqlTask, input: string): Promise<Checked> {
  const kind = task.kind ?? "read";
  const kinds = statementKinds(input);

  if (kind === "read" && kinds.some((k) => WRITE.has(k)) && !hasTransactionControl(kinds)) {
    const message = "This task asks you to read rows with SELECT, and that statement changes data or tables instead. Nothing was run.";
    return { run: { ok: false, message }, feedback: { ok: false, kind: "kind", message } };
  }

  if (kind === "read") {
    const mine = await runInRollback(db, input);
    if (!mine.outcome.ok) return { run: mine.outcome, feedback: { ok: false, kind: "error", message: mine.outcome.message } };
    const want = await runInRollback(db, task.answer ?? task.solution);
    if (!want.outcome.ok) throw new Error(`Task ${task.id}: the answer fails: ${want.outcome.message}`);
    return { run: mine.outcome, feedback: compareResults(want.outcome.result, mine.outcome.result, { ordered: task.ordered, namedColumns: task.namedColumns }) };
  }

  const mine = await runInRollback(db, input, task.verify);
  if (!mine.outcome.ok) return { run: mine.outcome, feedback: { ok: false, kind: "error", message: mine.outcome.message } };
  if (!mine.after?.ok) {
    const why = mine.after && !mine.after.ok ? mine.after.message : "";
    return { run: mine.outcome, feedback: { ok: false, kind: "error", message: `Your statement ran, but afterwards the check couldn't: ${why}` } };
  }
  const want = await runInRollback(db, task.solution, task.verify);
  if (!want.outcome.ok || !want.after?.ok) throw new Error(`Task ${task.id}: the solution or its verify query fails`);
  const feedback = compareResults(want.after.result, mine.after.result, { ordered: task.ordered });
  if (!feedback.ok && feedback.kind === "rows") {
    const missing = minus(want.after.result.rows, mine.after.result.rows).length;
    const extra = minus(mine.after.result.rows, want.after.result.rows).length;
    // describeTable has one row per column and describeIndexes one per index, so speak of those.
    const cols = want.after.result.columns;
    const [unit, units] = cols[0] === "column_name" && cols.includes("rules") ? ["column", "columns"] : cols[0] === "keys" && cols.includes("is_unique") ? ["index", "indexes"] : ["row", "rows"];
    const count = (n: number) => `${n} ${n === 1 ? unit : units}`;
    const parts = [missing ? `${count(missing)} missing` : "", extra ? `${count(extra)} that shouldn't be there` : ""].filter(Boolean);
    feedback.message = missing === extra
      ? `After your statement, ${count(missing)} ${missing === 1 ? "doesn't" : "don't"} look the way ${missing === 1 ? "it" : "they"} should.`
      : `After your statement, the check finds ${parts.join(" and ")}.`;
  }
  return { run: mine.outcome, feedback };
}
