import { parse, toSql, type Expr, type SelectedColumn, type SelectFromStatement, type Statement, type WithStatement } from "pgsql-ast-parser";
import { changeFrames } from "./changes";
import { normalise } from "./compare";
import type { Db, QueryResult } from "./db";

/**
 * The replay: a query taken apart clause by clause, in the order Postgres works through it.
 * Every frame is the result of real SQL run in PGlite, and the last frame is the real result.
 */

export type Clause = "WITH" | "FROM" | "WHERE" | "GROUP BY" | "HAVING" | "OVER" | "SELECT" | "DISTINCT" | "ORDER BY" | "LIMIT" | "BEFORE" | "INSERT" | "UPDATE" | "DELETE";
/**
 * pass, fail, unknown: what WHERE or HAVING said. filled: a row an outer join filled with NULLs.
 * new, changed, gone: what INSERT, UPDATE or DELETE did to a row. plain: nothing to mark.
 */
export type Mark = "pass" | "fail" | "unknown" | "filled" | "new" | "changed" | "gone" | "plain";

export interface Frame {
  clause: Clause;
  /** Chip text when the clause alone isn't enough, like "WITH spend". */
  label?: string;
  note: string;
  columns: string[];
  /** At most MAX_FRAME_ROWS rows; `total` is the full count. */
  rows: unknown[][];
  total: number;
  /** WHERE and HAVING: what the test said for each row. FROM with an outer join: which rows it filled with NULLs. */
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

interface Shape {
  main: SelectFromStatement;
  /** The WITH around the main query, if any. */
  around?: WithStatement;
}

function readShape(ast: Statement): Shape | string {
  if (ast.type === "with recursive") return "The replay can't follow WITH RECURSIVE yet, so here's just its result.";
  if (ast.type === "with") {
    const main = checkSelect(ast.in);
    return typeof main === "string" ? main : { main, around: ast };
  }
  const main = checkSelect(ast);
  return typeof main === "string" ? main : { main };
}

/** The shapes the replay can take apart: one SELECT over tables and joins, no subqueries or window functions. */
function checkSelect(ast: Statement): SelectFromStatement | string {
  if (ast.type === "with" || ast.type === "with recursive") return "The replay follows one WITH at a time, so here's just its result.";
  if (ast.type === "union" || ast.type === "union all") return "The replay can't follow UNION yet, so here's just its result.";
  if (ast.type !== "select") return "The replay follows SELECT queries; here's what your statement did.";
  if (!ast.from?.length) return "There's no table here to replay.";
  if (ast.from.some((f) => f.type !== "table")) return "The replay can't follow a subquery in FROM yet, so here's just its result.";
  if (Array.isArray(ast.distinct)) return "The replay can't follow DISTINCT ON yet, so here's just its result.";
  if (ast.having && !ast.groupBy?.length) return "The replay can't follow HAVING without GROUP BY, so here's just its result.";
  let problem = "";
  // Window functions are followed in the SELECT list only.
  walk({ ...ast, columns: undefined }, (n) => {
    if (n.type && NESTED.has(n.type)) problem = "The replay can't follow a query inside a query yet, so here's just its result.";
    else if (n.type === "call" && n.over) problem = "The replay follows window functions in the SELECT list only, so here's just its result.";
    return !problem;
  });
  walk(ast.columns, (n) => {
    if (n.type && NESTED.has(n.type)) problem = "The replay can't follow a query inside a query yet, so here's just its result.";
    return !problem;
  });
  return problem || ast;
}

interface Source {
  table: string;
  /** A real table (it has ctid row ids); a WITH step does not. */
  real: boolean;
  schema?: string;
  alias: string;
  columns: string[];
}

const ref = (name: string, table?: string): Expr => (table ? { type: "ref", table: { name: table }, name } : { type: "ref", name }) as Expr;

/** One stage query; any failure hides the replay (see buildReplay). */
async function q(db: Db, sql: string): Promise<QueryResult> {
  return db.query(sql);
}

/** What a join dropped (rows with no match) and what an outer join kept with NULLs. */
async function joinNote(
  db: Db,
  stmt: (over: Partial<SelectFromStatement>) => string,
  print: (s: SelectFromStatement) => string,
  sources: Source[],
  filledBy: Map<number, string>,
  rows: number,
): Promise<string> {
  if (sources.some((s) => !s.real)) return "";
  const count = (arg: Expr, distinct = false) => ({ type: "call", function: { name: "count" }, args: [arg], ...(distinct ? { distinct: "distinct" } : {}) }) as unknown as Expr;
  const cols = sources.flatMap((s, i) => [
    { expr: count(ref("ctid", s.alias), true), alias: { name: `__d${i}` } },
    { expr: count(ref("ctid", s.alias)), alias: { name: `__c${i}` } },
  ]);
  const r = (await db.query(stmt({ columns: cols, where: undefined, groupBy: undefined, having: undefined, orderBy: undefined, limit: undefined, distinct: undefined }))).rows[0] ?? [];
  const parts: string[] = [];
  for (const [i, s] of sources.entries()) {
    const probe = print({ type: "select", columns: [{ expr: count(ref("*")) }], from: [{ type: "table", name: { name: s.table, schema: s.schema } }] } as SelectFromStatement);
    const total = Number((await db.query(probe)).rows[0]?.[0]);
    const out = total - Number(r[2 * i]);
    if (out > 0) parts.push(`${out} ${out === 1 ? "row" : "rows"} of ${s.table} had no match, so ${out === 1 ? "it's" : "they're"} left out.`);
    const filled = rows - Number(r[2 * i + 1]);
    if (filled > 0) parts.push(`${filled} had no match in ${s.table}, so ${filledBy.get(i) ?? "the join"} kept ${filled === 1 ? "it" : "them"} with NULLs.`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

/**
 * Replays the last statement of what the learner ran; any statements before it run first, in the same
 * transaction, which is rolled back afterwards.
 */
export async function buildReplay(db: Db, sql: string): Promise<Replay> {
  let statements: Statement[];
  try {
    statements = parse(sql, { locationTracking: true });
  } catch {
    return no("The replay can't read this query yet, so here's just its result.");
  }
  const last = statements[statements.length - 1];
  if (!last) return no("There's nothing to replay.");
  // Each statement's text runs from its start to the next one's (the parser's end positions can fall short).
  const starts = statements.map((n) => (n as Located)._location?.start ?? 0);
  const source = (i: number) => sql.slice(starts[i], starts[i + 1] ?? sql.length).trim().replace(/;$/, "");
  const first = statements.slice(0, -1).map((_, i) => source(i)).join(";\n");
  const text = (n: unknown): string => {
    const loc = (n as Located)._location;
    return loc ? sql.slice(loc.start, loc.end).trim() : toSql.expr(n as Expr);
  };
  const shape = last.type === "insert" || last.type === "update" || last.type === "delete" ? null : readShape(last);
  if (typeof shape === "string") return no(shape);

  await db.exec("BEGIN");
  try {
    if (first) await db.exec(first);
    if (last.type === "insert" || last.type === "update" || last.type === "delete") return await changeFrames(db, last);
    return await frames(db, source(statements.length - 1), shape!, text);
  } catch {
    return no("The replay couldn't follow this query, so here's just its result.");
  } finally {
    await db.exec("ROLLBACK");
  }
}

async function frames(db: Db, sql: string, { main: ast, around }: Shape, text: (n: unknown) => string): Promise<Replay> {
  /** Every stage query runs inside the learner's WITH, so the main query can read its steps. */
  const print = (s: SelectFromStatement) => toSql.statement(around ? { ...around, in: s } : s);
  const stmt = (over: Partial<SelectFromStatement>) => print({ ...ast, ...over } as SelectFromStatement);
  const bare = { groupBy: undefined, having: undefined, orderBy: undefined, limit: undefined, distinct: undefined };

  // Every source table's columns, labelled by table where two tables share a name.
  const sources: Source[] = [];
  for (const f of ast.from!) {
    if (f.type !== "table") return no("The replay can't follow this FROM yet.");
    const name = f.name;
    const probe = print({ type: "select", columns: [{ expr: ref("*") }], from: [{ type: "table", name: { name: name.name, schema: name.schema } }], limit: { limit: { type: "integer", value: 0 } } } as SelectFromStatement);
    const cols = (await q(db, probe)).fields.map((x) => x.name);
    const step = !name.schema && (around?.bind ?? []).some((b) => b.alias.name === name.name);
    sources.push({ table: name.name, real: !step, schema: name.schema, alias: name.alias ?? name.name, columns: cols });
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

  // WITH: each named step's rows first, in the order they're written.
  for (const b of around?.bind ?? []) {
    const name = b.alias.name;
    const rw = await q(db, print({ type: "select", columns: [{ expr: ref("*") }], from: [{ type: "table", name: { name } }] } as SelectFromStatement));
    out.push({
      clause: "WITH",
      label: `WITH ${name}`,
      note: `WITH made a step called ${name}: ${plural(rw.rows.length, "row")}. The main query reads it like a table.`,
      columns: rw.fields.map((x) => x.name),
      rows: cap(rw.rows),
      total: rw.rows.length,
    });
  }

  // Sources an outer join can fill with NULLs, and the join that does it.
  const filledBy = new Map<number, string>();
  ast.from!.forEach((f, i) => {
    const kind = (f as { join?: { type?: string } }).join?.type;
    if (kind === "LEFT JOIN" || kind === "FULL JOIN") filledBy.set(i, kind);
    if (kind === "RIGHT JOIN" || kind === "FULL JOIN") for (let j = 0; j < i; j++) filledBy.set(j, kind);
  });
  const nullable = [...filledBy.keys()].filter((i) => sources[i]!.real);

  // FROM, and WHERE's verdict on each of those rows (one query, so the rows line up).
  const pass = ast.where ? [{ expr: ast.where, alias: { name: "__pass" } }] : [];
  const fills = nullable.map((i) => ({ expr: { type: "unary", op: "IS NULL", operand: ref("ctid", sources[i]!.alias) } as unknown as Expr, alias: { name: `__f${i}` } }));
  const r1 = await q(db, stmt({ ...bare, columns: [...all, ...pass, ...fills], where: undefined }));
  const fromRows = r1.rows.map((r) => r.slice(0, all.length));
  const tables = sources.map((s) => s.table);
  const firstFill = all.length + pass.length;
  out.push({
    clause: "FROM",
    note: sources.length === 1 ? `FROM starts with every row of ${tables[0]}: ${plural(fromRows.length, "row")}.` : `FROM joined ${listing(tables)} into ${plural(fromRows.length, "row")}.` + (await joinNote(db, stmt, print, sources, filledBy, fromRows.length)),
    columns: allLabels,
    rows: cap(fromRows),
    total: fromRows.length,
    ...(nullable.length ? { marks: cap(r1.rows.map((r): Mark => (r.slice(firstFill).some((v) => v === true) ? "filled" : "plain"))) } : {}),
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

  // OVER: a window function's rows, split into groups and sorted the way the window sees them.
  const windows: Node[] = [];
  walk(selected, (n) => {
    if (n.type === "call" && n.over) { windows.push(n); return false; }
  });
  if (windows.length) {
    const win = windows[0]!;
    const spec = win.over as { partitionBy?: Expr[]; orderBy?: { by: Expr; order?: string; nulls?: string }[] };
    const parts = spec.partitionBy ?? [];
    const sortBy = spec.orderBy ?? [];
    const rank = { type: "call", function: { name: "dense_rank" }, args: [], over: { orderBy: parts.map((by) => ({ by })) } } as unknown as Expr;
    const rw = await q(db, stmt({ columns: [...selected, ...(parts.length ? [{ expr: rank, alias: { name: "__g" } }] : [])], distinct: undefined, limit: undefined, orderBy: parts.length || sortBy.length ? ([...parts.map((by) => ({ by })), ...sortBy] as SelectFromStatement["orderBy"]) : undefined }));
    const width = parts.length ? rw.fields.length - 1 : rw.fields.length;
    const groups = parts.length ? rw.rows.map((r) => Number(r[width]) - 1) : undefined;
    const fn = ((win.function as { name: string }).name ?? "").toLowerCase();
    const sorted = sortBy.map((o) => text(o.by) + (o.order === "DESC" ? " DESC" : "")).join(", ");
    const what =
      fn === "row_number" ? `numbered the rows from 1${parts.length ? " in each group" : ""}`
      : fn === "rank" ? "ranked them; ties share a rank"
      : fn === "dense_rank" ? "ranked them; ties share a rank and no numbers are skipped"
      : AGGREGATES.has(fn) ? (sortBy.length ? `worked out a running ${fn}` : parts.length ? `put each group's ${fn} on its rows` : `put the ${fn} of all of them on every row`)
      : `worked out ${text(win)} for every row`;
    const count = groups ? new Set(groups).size : 0;
    const note = parts.length
      ? `OVER split the ${plural(rw.rows.length, "row")} into ${plural(count, "group")} by ${parts.map(text).join(", ")}${sortBy.length ? `, sorted each by ${sorted}` : ""}, and ${what}.`
      : `OVER ${sortBy.length ? `sorted the ${plural(rw.rows.length, "row")} by ${sorted} and` : `looked at all ${plural(rw.rows.length, "row")} at once and`} ${what}.`;
    out.push({
      clause: "OVER",
      note,
      columns: rw.fields.slice(0, width).map((x) => x.name),
      rows: cap(rw.rows.map((r) => r.slice(0, width))),
      total: rw.rows.length,
      ...(groups ? { groups: cap(groups) } : {}),
    });
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
