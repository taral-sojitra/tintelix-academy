import type { ResultSet } from "./compare";
import type { Db, QueryResult } from "./db";
import { plainError } from "./errors";

export type RunOutcome =
  | { ok: true; result: ResultSet; command: string; rowCount: number; ms: number }
  | { ok: false; message: string; code?: string };

/** The first keyword of each statement, upper-cased; strings, quoted names and comments are skipped. */
export function statementKinds(sql: string): string[] {
  const kinds: string[] = [];
  let word = "";
  let seen = false;
  const end = () => {
    if (word) kinds.push(word.toUpperCase());
    word = "";
    seen = false;
  };
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    const next = sql[i + 1];
    if (c === "-" && next === "-") { while (i < sql.length && sql[i] !== "\n") i++; if (word) seen = true; continue; }
    if (c === "/" && next === "*") { const j = sql.indexOf("*/", i + 2); i = j < 0 ? sql.length : j + 1; if (word) seen = true; continue; }
    if (c === "'" || c === '"') { const j = sql.indexOf(c, i + 1); i = j < 0 ? sql.length : j; seen = true; continue; }
    if (c === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))?.[0];
      if (tag) { const j = sql.indexOf(tag, i + tag.length); i = j < 0 ? sql.length : j + tag.length - 1; seen = true; continue; }
    }
    if (c === ";") { end(); continue; }
    if (!seen && /[A-Za-z]/.test(c)) { word += c; continue; }
    if (word || /\S/.test(c)) seen = true;
  }
  end();
  return kinds;
}

const TRANSACTION = new Set(["BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "RELEASE", "END", "START", "ABORT"]);
export const hasTransactionControl = (kinds: string[]) => kinds.some((k) => TRANSACTION.has(k));

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function failure(e: unknown): RunOutcome {
  const err = e as { code?: string; message?: string };
  const message = err?.message ?? String(e);
  return err?.code ? { ok: false, message: plainError(err.code, message), code: err.code } : { ok: false, message: plainError(undefined, message) };
}

/** The last statement's result. PGlite's affectedRows adds up over one exec call, so subtract the one before. */
function success(results: QueryResult[], command: string, ms: number): RunOutcome {
  const r = results[results.length - 1];
  const before = results.length > 1 ? (results[results.length - 2]?.affectedRows ?? 0) : 0;
  const columns = r?.fields.map((f) => f.name) ?? [];
  const rows = r?.rows ?? [];
  return { ok: true, result: { columns, rows }, command, rowCount: columns.length ? rows.length : (r?.affectedRows ?? 0) - before, ms };
}

/** An unknown column that is really an AS name used too early gets its own explanation. */
function explainAlias(outcome: RunOutcome, sql: string): RunOutcome {
  if (outcome.ok || outcome.code !== "42703") return outcome;
  const name = /There's no column called (\S+)\. /.exec(outcome.message)?.[1];
  if (!name || !new RegExp(`\\bAS\\s+"?${name.replace(/[^\w]/g, "")}"?\\b`, "i").test(sql)) return outcome;
  return { ...outcome, message: `${name} is a name you gave with AS, but WHERE and HAVING run before SELECT names its columns. Repeat the expression instead.` };
}

/**
 * Runs the learner's SQL inside BEGIN … ROLLBACK, so every run starts from the untouched shop.
 * `after` (a verify query) runs in the same transaction, after the learner's statements.
 */
export async function runInRollback(db: Db, sql: string, after?: string): Promise<{ outcome: RunOutcome; after?: RunOutcome }> {
  const kinds = statementKinds(sql);
  if (!kinds.length) return { outcome: { ok: false, message: "Write a query first." } };
  if (hasTransactionControl(kinds)) {
    return { outcome: { ok: false, message: "Every query here runs inside its own transaction, which is thrown away afterwards, so leave out BEGIN, COMMIT and ROLLBACK." } };
  }
  await db.exec("BEGIN");
  try {
    let outcome: RunOutcome;
    const t0 = now();
    try {
      const results = await db.exec(sql);
      const kind = kinds[kinds.length - 1]!;
      outcome = success(results, kind === "WITH" && results[results.length - 1]?.fields.length ? "SELECT" : kind, now() - t0);
    } catch (e) {
      return { outcome: explainAlias(failure(e), sql) };
    }
    if (!after) return { outcome };
    try {
      return { outcome, after: success(await db.exec(after), "SELECT", 0) };
    } catch (e) {
      return { outcome, after: failure(e) };
    }
  } finally {
    await db.exec("ROLLBACK");
  }
}
