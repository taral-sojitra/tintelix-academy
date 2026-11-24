import { parse, toSql, type Expr, type SelectedColumn, type SelectFromStatement } from "pgsql-ast-parser";
import { normalise } from "./compare";
import type { Db, QueryResult } from "./db";

/**
 * The replay: a query taken apart clause by clause, in the order Postgres works through it.
 * Every frame is the result of real SQL run in PGlite, and the last frame is the real result.
 */

export type Clause = "FROM" | "WHERE" | "GROUP BY" | "HAVING" | "SELECT" | "DISTINCT" | "ORDER BY" | "LIMIT";
export type Mark = "pass" | "fail" | "unknown";

export interface Frame {
  clause: Clause;
  note: string;
  columns: string[];
  /** At most MAX_FRAME_ROWS rows; `total` is the full count. */
  rows: unknown[][];
  total: number;
  /** WHERE and HAVING: what the test said for each row. */
  marks?: Mark[];
  /** GROUP BY: the bucket each row fell into, counted from 0; rows come sorted by bucket. */
  groups?: number[];
  /** SELECT: the columns it kept. */
  picked?: string[];
}

export type Replay = { supported: true; frames: Frame[] } | { supported: false; reason: string };

export const MAX_FRAME_ROWS = 200;
const AGGREGATES = new Set(["count", "sum", "avg", "min", "max", "string_agg", "array_agg", "bool_and", "bool_or", "every"]);
const NESTED = new Set(["select", "union", "union all", "with", "with recursive", "values"]);
const TEXT_TYPES = new Set([19, 25, 1042, 1043]);
const DATE_TYPES = new Set([1082, 1114, 1184]);

type Node = { type?: string; [k: string]: unknown };
type Located = { _location?: { start: number; end: number } };

const no = (reason: string): Replay => ({ supported: false, reason });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listing = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Visits every node under `root` (not `root` itself); return false to skip a node's children. */
function walk(root: unknown, visit: (n: Node) => boolean | void): void {
  const go = (v: unknown, top: boolean) => {
    if (Array.isArray(v)) return v.forEach((x) => go(x, false));
    if (!v || typeof v !== "object") return;
    if (!top && visit(v as Node) === false) return;
    for (const [k, child] of Object.entries(v)) if (k !== "_location") go(child, false);
  };
  go(root, true);
}

function readShape(sql: string): SelectFromStatement | string {
  let statements;
  try {
    statements = parse(sql, { locationTracking: true });
  } catch {
    return "The replay can't read this query yet, so here's just its result.";
  }
  if (statements.length !== 1) return "The replay follows one query at a time; this shows the last result.";
  const ast = statements[0]!;
  if (ast.type === "with" || ast.type === "with recursive") return "The replay can't follow WITH yet, so here's just its result.";
  if (ast.type === "union" || ast.type === "union all") return "The replay can't follow UNION yet, so here's just its result.";
  if (ast.type !== "select") return "The replay follows SELECT queries; here's what your statement did.";
  if (!ast.from?.length) return "There's no table here to replay.";
  if (ast.from.some((f) => f.type !== "table")) return "The replay can't follow a subquery in FROM yet, so here's just its result.";
  if (Array.isArray(ast.distinct)) return "The replay can't follow DISTINCT ON yet, so here's just its result.";
  if (ast.having && !ast.groupBy?.length) return "The replay can't follow HAVING without GROUP BY, so here's just its result.";
  let problem = "";
  walk(ast, (n) => {
    if (n.type && NESTED.has(n.type)) problem = "The replay can't follow a query inside a query yet, so here's just its result.";
    else if (n.type === "call" && n.over) problem = "The replay can't follow window functions yet, so here's just its result.";
    return !problem;
  });
  return problem || ast;
}

interface Source {
  table: string;
  schema?: string;
  alias: string;
  columns: string[];
}

const ref = (name: string, table?: string): Expr => (table ? { type: "ref", table: { name: table }, name } : { type: "ref", name }) as Expr;

/** One stage query; any failure hides the replay (see buildReplay). */
async function q(db: Db, sql: string): Promise<QueryResult> {
  return db.query(sql);
}

export async function buildReplay(db: Db, sql: string): Promise<Replay> {
  const shape = readShape(sql);
  if (typeof shape === "string") return no(shape);
  const ast = shape;
  const text = (n: unknown): string => {
    const loc = (n as Located)._location;
    return loc ? sql.slice(loc.start, loc.end).trim() : toSql.expr(n as Expr);
  };

  await db.exec("BEGIN");
  try {
    return await frames(db, sql, ast, text);
  } catch {
    return no("The replay couldn't follow this query, so here's just its result.");
  } finally {
    await db.exec("ROLLBACK");
  }
}

async function frames(db: Db, sql: string, ast: SelectFromStatement, text: (n: unknown) => string): Promise<Replay> {
  const stmt = (over: Partial<SelectFromStatement>) => toSql.statement({ ...ast, ...over } as SelectFromStatement);
  const bare = { groupBy: undefined, having: undefined, orderBy: undefined, limit: undefined, distinct: undefined };

  // Every source table's columns, labelled by table where two tables share a name.
  const sources: Source[] = [];
  for (const f of ast.from!) {
    if (f.type !== "table") return no("The replay can't follow this FROM yet.");
    const name = f.name;
    const probe = toSql.statement({ type: "select", columns: [{ expr: ref("*") }], from: [{ type: "table", name: { name: name.name, schema: name.schema } }], limit: { limit: { type: "integer", value: 0 } } } as SelectFromStatement);
    const cols = (await q(db, probe)).fields.map((x) => x.name);
    sources.push({ table: name.name, schema: name.schema, alias: name.alias ?? name.name, columns: cols });
  }
  const seen = new Map<string, number>();
  for (const s of sources) for (const c of s.columns) seen.set(c, (seen.get(c) ?? 0) + 1);
  const label = (s: Source, c: string) => ((seen.get(c) ?? 0) > 1 ? `${s.alias}.${c}` : c);
  const labelled = (s: Source, c: string): SelectedColumn => ({ expr: ref(c, s.alias), alias: { name: label(s, c) } });
  const all = sources.flatMap((s) => s.columns.map((c) => labelled(s, c)));
  const allLabels = sources.flatMap((s) => s.columns.map((c) => label(s, c)));

  const resolve = (r: Node): [Source, string] | undefined => {
    const name = r.name as string;
    const table = (r.table as { name?: string } | undefined)?.name;
    if (name === "*") return undefined;
    const hits = sources.filter((s) => (table ? s.alias === table : true) && s.columns.includes(name));
    return hits.length === 1 ? [hits[0]!, name] : undefined;
  };

  const cap = <T,>(xs: T[]) => xs.slice(0, MAX_FRAME_ROWS);
  const out: Frame[] = [];

  // FROM, and WHERE's verdict on each of those rows (one query, so the rows line up).
  const pass = ast.where ? [{ expr: ast.where, alias: { name: "__pass" } }] : [];
  const r1 = await q(db, stmt({ ...bare, columns: [...all, ...pass], where: undefined }));
  const fromRows = r1.rows.map((r) => r.slice(0, all.length));
  const tables = sources.map((s) => s.table);
  out.push({
    clause: "FROM",
    note: sources.length === 1 ? `FROM starts with every row of ${tables[0]}: ${plural(fromRows.length, "row")}.` : `FROM joined ${listing(tables)} into ${plural(fromRows.length, "row")}.`,
    columns: allLabels,
    rows: cap(fromRows),
    total: fromRows.length,
  });
  let remaining = fromRows.length;
  if (ast.where) {
    const marks: Mark[] = r1.rows.map((r) => (r[all.length] === true ? "pass" : r[all.length] === false ? "fail" : "unknown"));
    const kept = marks.filter((m) => m === "pass").length;
    const unknown = marks.filter((m) => m === "unknown").length;
    out.push({
      clause: "WHERE",
      note: `WHERE kept ${kept} of ${plural(marks.length, "row")}.` + (unknown ? ` ${unknown} hit a NULL, which is never equal to anything, so ${unknown === 1 ? "it was" : "they were"} dropped too.` : ""),
      columns: allLabels,
      rows: cap(fromRows),
      total: fromRows.length,
      marks: cap(marks),
    });
    remaining = kept;
  }

  // GROUP BY keys, with `GROUP BY 1` and output names turned into the expressions they stand for.
  const selected = ast.columns ?? [];
  const keys: Expr[] = (ast.groupBy ?? []).map((k) => {
    const n = k as Node;
    if (n.type === "integer") return selected[(n.value as number) - 1]?.expr ?? k;
    if (n.type === "ref" && !n.table && !resolve(n)) return selected.find((c) => c.alias?.name === n.name)?.expr ?? k;
    return k;
  });
  const keyOrder = keys.map((by) => ({ by }));

  if (keys.length) {
    const used: SelectedColumn[] = [];
    const usedLabels: string[] = [];
    walk([selected, keys, ast.having, ast.orderBy], (n) => {
      if (n.type !== "ref") return;
      const hit = resolve(n);
      if (!hit) return;
      const l = label(...hit);
      if (!usedLabels.includes(l)) { usedLabels.push(l); used.push(labelled(...hit)); }
    });
    const rank = { type: "call", function: { name: "dense_rank" }, args: [], over: { orderBy: keyOrder } } as unknown as Expr;
    const rg = await q(db, stmt({ ...bare, columns: [...used, { expr: rank, alias: { name: "__g" } }], orderBy: [{ by: ref("__g") }] }));
    const groups = rg.rows.map((r) => Number(r[used.length]) - 1);
    const count = new Set(groups).size;
    out.push({
      clause: "GROUP BY",
      note: `GROUP BY put the ${plural(rg.rows.length, "row")} into ${plural(count, "group")}, one per ${keys.map(text).join(", ")}.`,
      columns: usedLabels,
      rows: cap(rg.rows.map((r) => r.slice(0, used.length))),
      total: rg.rows.length,
      groups: cap(groups),
    });
    remaining = count;

    if (ast.having) {
      const shown = new Set(selected.map((c) => text(c.expr)));
      const extra: SelectedColumn[] = [];
      walk(ast.having, (n) => {
        if (n.type === "call" && AGGREGATES.has(((n.function as { name: string }).name ?? "").toLowerCase())) {
          const t = text(n);
          if (!shown.has(t)) { shown.add(t); extra.push({ expr: n as unknown as Expr, alias: { name: t } }); }
          return false;
        }
      });
      const rh = await q(db, stmt({ columns: [...selected, ...extra, { expr: ast.having, alias: { name: "__pass" } }], having: undefined, orderBy: keyOrder, limit: undefined, distinct: undefined }));
      const width = rh.fields.length - 1;
      const marks: Mark[] = rh.rows.map((r) => (r[width] === true ? "pass" : r[width] === false ? "fail" : "unknown"));
      const kept = marks.filter((m) => m === "pass").length;
      out.push({
        clause: "HAVING",
        note: `HAVING kept ${kept} of ${plural(marks.length, "group")}.`,
        columns: rh.fields.slice(0, width).map((x) => x.name),
        rows: cap(rh.rows.map((r) => r.slice(0, width))),
        total: rh.rows.length,
        marks: cap(marks),
      });
      remaining = kept;
    }
  }

  // SELECT: the columns, before DISTINCT, ORDER BY and LIMIT.
  const rs = await q(db, stmt({ distinct: undefined, orderBy: keys.length ? keyOrder : undefined, limit: undefined }));
  const picked = rs.fields.map((x) => x.name);
  const star = selected.length === 1 && (selected[0]!.expr as Node).type === "ref" && (selected[0]!.expr as Node).name === "*";
  let summarised = false;
  const overColumn: Node[] = [];
  walk(selected, (n) => {
    if (n.type === "call" && AGGREGATES.has(((n.function as { name: string }).name ?? "").toLowerCase())) {
      summarised = true;
      const args = (n.args as Node[] | undefined) ?? [];
      if (args.length === 1 && !(args[0]!.type === "ref" && args[0]!.name === "*")) overColumn.push(n);
      return false;
    }
  });
  // A summary over a column skips its NULLs; say how many, since that's the surprise.
  const skipped: string[] = [];
  if (summarised && !keys.length && overColumn.length) {
    const count = (arg: unknown) => ({ type: "call", function: { name: "count" }, args: [arg] }) as unknown as Expr;
    const cols = overColumn.flatMap((n, i) => [
      { expr: count(ref("*")), alias: { name: `__all${i}` } },
      { expr: count((n.args as unknown[])[0]), alias: { name: `__has${i}` } },
    ]);
    const rn = await q(db, stmt({ ...bare, columns: cols }));
    overColumn.forEach((n, i) => {
      const gap = Number(rn.rows[0]?.[2 * i]) - Number(rn.rows[0]?.[2 * i + 1]);
      if (gap > 0) skipped.push(`${text(n)} skipped ${plural(gap, "NULL")}`);
    });
  }
  out.push({
    clause: "SELECT",
    note: keys.length
      ? `SELECT made one row per group: ${plural(rs.rows.length, "row")}.`
      : summarised
        ? `SELECT summarised ${plural(remaining, "row")} into one.` + (skipped.length ? ` ${skipped.join("; ")}.` : "")
        : star
          ? "SELECT * kept every column."
          : `SELECT picked ${listing(picked)}.`,
    columns: picked,
    rows: cap(rs.rows),
    total: rs.rows.length,
    picked,
  });
  let before = rs.rows.length;

  if (ast.distinct === "distinct") {
    const rd = await q(db, stmt({ orderBy: undefined, limit: undefined }));
    const gone = before - rd.rows.length;
    out.push({
      clause: "DISTINCT",
      note: `DISTINCT removed ${plural(gone, "duplicate row")}, leaving ${rd.rows.length}.`,
      columns: rd.fields.map((x) => x.name),
      rows: cap(rd.rows),
      total: rd.rows.length,
    });
    before = rd.rows.length;
  }

  if (ast.orderBy?.length) {
    const ro = await q(db, stmt({ limit: undefined }));
    const parts = ast.orderBy.map((o) => {
      const name = text(o.by);
      const field = ro.fields.find((x) => x.name === name || x.name === (o.by as Node).name);
      const desc = o.order === "DESC";
      const way = !field ? (desc ? "descending" : "ascending")
        : TEXT_TYPES.has(field.dataTypeID) ? (desc ? "Z to A" : "A to Z")
        : DATE_TYPES.has(field.dataTypeID) ? (desc ? "newest first" : "oldest first")
        : desc ? "high to low" : "low to high";
      return `${name} (${way})`;
    });
    out.push({
      clause: "ORDER BY",
      note: `ORDER BY sorted the rows by ${parts.join(", then ")}.`,
      columns: ro.fields.map((x) => x.name),
      rows: cap(ro.rows),
      total: ro.rows.length,
    });
    before = ro.rows.length;
  }

  if (ast.limit) {
    const rl = await q(db, stmt({}));
    const offset = ast.limit.offset ? text(ast.limit.offset) : "";
    out.push({
      clause: "LIMIT",
      note: offset
        ? `OFFSET skipped ${offset}, then LIMIT kept the next ${rl.rows.length} of ${plural(before, "row")}.`
        : `LIMIT kept the first ${rl.rows.length} of ${plural(before, "row")}.`,
      columns: rl.fields.map((x) => x.name),
      rows: cap(rl.rows),
      total: rl.rows.length,
    });
  }

  // The last frame must be the real result; if it isn't, the replay is hidden rather than wrong.
  const real = await q(db, sql);
  const last = out[out.length - 1]!;
  const key = (rows: unknown[][]) => rows.map((r) => JSON.stringify(r.map(normalise)));
  const ours = key(await q(db, stmt({})).then((r) => r.rows));
  const theirs = key(real.rows);
  const same = ast.orderBy?.length ? ours.join("\n") === theirs.join("\n") : [...ours].sort().join("\n") === [...theirs].sort().join("\n");
  if (!same) return no("The replay didn't match the real result, so it's hidden.");
  last.rows = cap(real.rows);
  last.total = real.rows.length;
  last.columns = real.fields.map((x) => x.name);
  return { supported: true, frames: out };
}
