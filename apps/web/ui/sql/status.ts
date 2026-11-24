import type { Checked } from "@tintelix/sql";

/** Statements whose row count means rows changed; anything else (CREATE, ALTER, DROP, TRUNCATE…) just ran. */
const CHANGES = new Set(["INSERT", "UPDATE", "DELETE", "MERGE"]);

/** The line under the stage: what the last run did, how long it took, and where it ran. */
export function runStatus(checked: Checked | null, busy: boolean, booted: boolean): string {
  if (busy) return booted ? "Running…" : "Starting Postgres in your browser…";
  if (!checked) return booted ? "Postgres is ready · runs in your browser" : "Starting Postgres in your browser…";
  const run = checked.run;
  if (!run.ok) return "Didn't run · runs in your browser";
  const ms = run.ms < 1 ? "under 1 ms" : `${Math.round(run.ms)} ms`;
  const what = run.result.columns.length
    ? `${run.rowCount} ${run.rowCount === 1 ? "row" : "rows"}`
    : CHANGES.has(run.command)
      ? `${run.command} · ${run.rowCount} ${run.rowCount === 1 ? "row" : "rows"} changed`
      : `${run.command} ran`;
  return `${what} · ${ms} · runs in your browser`;
}
