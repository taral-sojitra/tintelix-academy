/** Comparing a learner's result with the answer, and saying what's wrong in plain words. */

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}

export type FeedbackKind = "error" | "columns" | "rows" | "order" | "kind";

export type Feedback =
  | { ok: true }
  | { ok: false; kind: FeedbackKind; message: string; missing?: unknown[][]; extra?: unknown[][]; shouldBe?: number[] };

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** One canonical string per value, so 2499 and "2499.00" (how Postgres sends numerics) compare equal. */
export function normalise(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint" || (typeof v === "string" && NUMERIC.test(v))) {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return String(Number(n.toFixed(6)));
  }
  if (v instanceof Date) {
    const s = v.toISOString();
    return s.endsWith("T00:00:00.000Z") ? s.slice(0, 10) : s;
  }
  if (typeof v === "boolean") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalise));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Multiset difference: rows of `a` not matched by a row of `b`, duplicates counted. */
function minus(a: unknown[][], b: unknown[][]): unknown[][] {
  const left = new Map<string, number>();
  for (const r of b) left.set(rowKey(r), (left.get(rowKey(r)) ?? 0) + 1);
  const out: unknown[][] = [];
  for (const r of a) {
    const k = rowKey(r);
    const n = left.get(k) ?? 0;
    if (n > 0) left.set(k, n - 1);
    else out.push(r);
  }
  return out;
}

const columnKey = (rows: unknown[][], i: number) => rows.map((r) => normalise(r[i])).sort().join("\u0000");

/** If the actual columns are the expected ones in another order, the permutation that fixes them. */
function reordered(expected: ResultSet, actual: ResultSet): boolean {
  const want = expected.columns.map((_, i) => columnKey(expected.rows, i));
  const have = actual.columns.map((_, i) => columnKey(actual.rows, i));
  const used = new Set<number>();
  const perm = want.map((k) => {
    const j = have.findIndex((h, idx) => h === k && !used.has(idx));
    if (j >= 0) used.add(j);
    return j;
  });
  if (perm.some((j) => j < 0) || perm.every((j, i) => j === i)) return false;
  return minus(expected.rows, actual.rows.map((r) => perm.map((j) => r[j]))).length === 0;
}

export function compareResults(
  expected: ResultSet,
  actual: ResultSet,
  opts: { ordered: boolean; namedColumns?: string[] },
): Feedback {
  if (actual.columns.length !== expected.columns.length) {
    return { ok: false, kind: "columns", message: `Your result has ${plural(actual.columns.length, "column")}; this task wants ${expected.columns.length}.` };
  }
  if (actual.rows.length === expected.rows.length && reordered(expected, actual)) {
    return { ok: false, kind: "columns", message: `Right values, but the columns are in a different order. This task wants them as: ${expected.columns.join(", ")}.` };
  }
  const named = opts.namedColumns;
  if (named && named.some((n, i) => n.toLowerCase() !== actual.columns[i]?.toLowerCase())) {
    return { ok: false, kind: "columns", message: `Name the columns ${named.join(", ")}. Yours are called ${actual.columns.join(", ")}.` };
  }

  const missing = minus(expected.rows, actual.rows);
  const extra = minus(actual.rows, expected.rows);
  if (missing.length || extra.length) {
    const parts = [
      missing.length ? `${plural(missing.length, "row")} ${missing.length === 1 ? "is" : "are"} missing` : "",
      extra.length ? `${missing.length ? extra.length : plural(extra.length, "row")} shouldn't be there` : "",
    ].filter(Boolean);
    const lead = `Your query returned ${plural(actual.rows.length, "row")}; the answer has ${expected.rows.length}.`;
    return { ok: false, kind: "rows", message: `${lead} ${parts.join(" and ")}.`, missing: missing.slice(0, 3), extra: extra.slice(0, 3) };
  }

  if (opts.ordered) {
    const keys = expected.rows.map(rowKey);
    const taken = new Set<number>();
    const shouldBe = actual.rows.map((r) => {
      const k = rowKey(r);
      const i = keys.findIndex((e, idx) => e === k && !taken.has(idx));
      taken.add(i);
      return i + 1;
    });
    if (shouldBe.some((p, i) => p !== i + 1)) {
      return { ok: false, kind: "order", message: "Right rows, wrong order. The numbers show where each row should be.", shouldBe };
    }
  }
  return { ok: true };
}
