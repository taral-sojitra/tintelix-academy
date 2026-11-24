import { parse, toSql, type DeleteStatement, type Expr, type InsertStatement, type QNameAliased, type SelectFromStatement, type UpdateStatement } from "pgsql-ast-parser";
import type { Db } from "./db";
import { MAX_FRAME_ROWS, type Frame, type Mark, type Replay } from "./frames";

/**
 * Replays INSERT, UPDATE and DELETE: the table with the rows WHERE picks, then the table after, with the new or
 * changed rows marked. Rows are sorted by primary key in both frames so they line up.
 */

export type Change = InsertStatement | UpdateStatement | DeleteStatement;

const ref = (name: string): Expr => ({ type: "ref", name }) as Expr;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listing = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const cap = <T,>(xs: T[]) => xs.slice(0, MAX_FRAME_ROWS);
const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
const CTID_TEXT = (parse("SELECT ctid::text")[0] as SelectFromStatement).columns![0]!.expr;

async function primaryKey(db: Db, t: QNameAliased): Promise<string[]> {
  const name = t.schema ? `quote_ident(${quote(t.schema)}) || '.' || quote_ident(${quote(t.name)})` : `quote_ident(${quote(t.name)})`;
  const r = await db.query(
    `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = to_regclass(${name}) AND i.indisprimary ORDER BY array_position(i.indkey::int2[], a.attnum)`,
  );
  return r.rows.map((x) => String(x[0]));
}

export async function changeFrames(db: Db, st: Change): Promise<Replay> {
  if (st.type === "update" && st.from) return { supported: false, reason: "The replay can't follow UPDATE … FROM yet; the result is on the right." };
  const target = st.type === "insert" ? st.into : st.type === "update" ? st.table : st.from;
  const name = target.name;
  const from = [{ type: "table", name: { name, schema: target.schema, alias: target.alias } }];
  const key = await primaryKey(db, target);
  const orderBy = (key.length ? key : ["ctid"]).map((c) => ({ by: ref(c) }));
  const where = st.type === "insert" ? undefined : st.where;

  // Before: every row, and which ones the WHERE picks.
  const before = await db.query(
    toSql.statement({ type: "select", columns: [{ expr: ref("*") }, ...(where ? [{ expr: where, alias: { name: "__m" } }] : [])], from, orderBy } as SelectFromStatement),
  );
  const width = where ? before.fields.length - 1 : before.fields.length;
  const columns = before.fields.slice(0, width).map((f) => f.name);
  const rows = before.rows.map((r) => r.slice(0, width));

  // The statement itself, reporting the row ids it touched.
  const touched = await db.query(toSql.statement({ ...st, returning: [{ expr: CTID_TEXT, alias: { name: "__ctid" } }] }));
  const ids = new Set(touched.rows.map((r) => String(r[0])));
  const count = touched.rows.length;

  const after = await db.query(
    toSql.statement({ type: "select", columns: [{ expr: ref("*") }, { expr: CTID_TEXT, alias: { name: "__ctid" } }], from: [{ type: "table", name: { name, schema: target.schema } }], orderBy } as SelectFromStatement),
  );
  const afterRows = after.rows.map((r) => r.slice(0, -1));
  const verb = st.type === "insert" ? "INSERT" : st.type === "update" ? "UPDATE" : "DELETE";
  const frames: Frame[] = [];

  if (where) {
    const picked = before.rows.map((r) => r[width]);
    const yes = picked.filter((v) => v === true).length;
    const unknown = picked.filter((v) => v !== true && v !== false).length;
    const hit: Mark = st.type === "delete" ? "gone" : "changed";
    frames.push({
      clause: "WHERE",
      note: `WHERE picked ${yes} of ${plural(rows.length, "row")} to ${st.type === "delete" ? "delete" : "change"}.` + (unknown ? ` ${unknown} hit a NULL, so ${unknown === 1 ? "it's" : "they're"} left alone.` : ""),
      columns,
      rows: cap(rows),
      total: rows.length,
      marks: cap(picked.map((v): Mark => (v === true ? hit : "plain"))),
    });
  } else {
    frames.push({
      clause: "BEFORE",
      note: st.type === "insert" ? `${name} has ${plural(rows.length, "row")} before the INSERT.` : `There's no WHERE, so ${verb} ${st.type === "delete" ? "removes" : "changes"} every row: all ${rows.length}.`,
      columns,
      rows: cap(rows),
      total: rows.length,
      ...(st.type === "delete" ? { marks: cap(rows.map((): Mark => "gone")) } : {}),
    });
  }

  const note =
    st.type === "insert" ? `INSERT added ${plural(count, "row")}, so ${name} now has ${afterRows.length}.`
    : st.type === "update" ? `UPDATE set ${listing(st.sets.map((s) => s.column.name))} on ${plural(count, "row")}.`
    : `DELETE removed ${plural(count, "row")}, so ${name} now has ${afterRows.length}.`;
  frames.push({
    clause: verb,
    note,
    columns: after.fields.slice(0, -1).map((f) => f.name),
    rows: cap(afterRows),
    total: afterRows.length,
    ...(st.type !== "delete" ? { marks: cap(after.rows.map((r): Mark => (ids.has(String(r[r.length - 1])) ? (st.type === "insert" ? "new" : "changed") : "plain"))) } : {}),
  });
  return { supported: true, frames };
}
