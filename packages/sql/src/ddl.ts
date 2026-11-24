import type { Statement } from "pgsql-ast-parser";
import type { Db } from "./db";
import type { Frame, Mark, Replay } from "./frames";
import { describeIndexes, describeTable } from "./tables";

export { describeIndexes, describeTable };

/** Table definitions: a verify query for define tasks, and replays for statements that make or change tables. */

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const listing = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Every row of a table, sorted by primary key (or physical order), at most 200. */
async function tableRows(db: Db, table: string) {
  const key = await db.query(
    `SELECT a.attname::text FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = ${regclass(table)} AND i.indisprimary ORDER BY array_position(i.indkey::int2[], a.attnum)`,
  );
  const order = key.rows.length ? key.rows.map((r) => ident(String(r[0]))).join(", ") : "ctid";
  const all = await db.query(`SELECT * FROM ${ident(table)} ORDER BY ${order} LIMIT 200`);
  const total = Number((await db.query(`SELECT count(*) FROM ${ident(table)}`)).rows[0]?.[0]);
  return { columns: all.fields.map((f) => f.name), rows: all.rows, total };
}
const regclass = (table: string) => `to_regclass(quote_ident(${quote(table)}))`;

/** A table's columns as rows of [column, type, rules], in plain SQL words. */
export async function tableColumns(db: Db, table: string): Promise<unknown[][]> {
  const attrs = await db.query(
    `SELECT a.attnum, a.attname::text, format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid), a.attidentity::text
     FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = ${regclass(table)} AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`,
  );
  const cons = await db.query(
    `SELECT contype::text, conkey::int[], pg_get_constraintdef(oid) FROM pg_constraint
     WHERE conrelid = ${regclass(table)} AND contype <> 'n' ORDER BY contype, conname`,
  );
  return attrs.rows.map(([num, name, type, notNull, def, identity]) => {
    const mine = cons.rows.filter((c) => (c[1] as number[]).includes(Number(num)));
    const rule = (kind: string) => mine.filter((c) => c[0] === kind);
    const many = (c: unknown[]) => (c[1] as number[]).length > 1;
    const rules: string[] = [];
    for (const c of rule("p")) rules.push(many(c) ? String(c[2]) : "PRIMARY KEY");
    if (notNull && !rule("p").length) rules.push("NOT NULL");
    for (const c of rule("u")) rules.push(many(c) ? String(c[2]) : "UNIQUE");
    for (const c of rule("f")) rules.push(many(c) ? String(c[2]) : String(c[2]).replace(/^FOREIGN KEY \([^)]*\) /, ""));
    for (const c of rule("c")) rules.push(tidyCheck(String(c[2])));
    if (identity || String(def ?? "").startsWith("nextval(")) rules.push("counts up by itself");
    else if (def !== null && def !== undefined) rules.push(`DEFAULT ${String(def).replace(/::[a-z ]+$/, "")}`);
    return [name, type, rules.join(", ")];
  });
}

const COLUMN_HEADS = ["column", "type", "rules"];

/** Drops bracket pairs that wrap a whole expression: "((a) AND (b))" becomes "(a) AND (b)". */
function unwrap(s: string): string {
  let out = s.trim();
  for (;;) {
    if (!out.startsWith("(")) return out;
    let depth = 0;
    let close = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === "(") depth++;
      else if (out[i] === ")" && --depth === 0) { close = i; break; }
    }
    if (close !== out.length - 1) return out;
    out = out.slice(1, -1).trim();
  }
}

const tidyCheck = (def: string) => def.replace(/^CHECK \((.*)\)$/s, (_, inner: string) => `CHECK (${unwrap(inner)})`);

/** Replays a statement that makes or changes a table, or returns null if it isn't one the replay follows. */
export async function ddlFrames(db: Db, st: Statement, sql: string): Promise<Replay | null> {
  if (st.type === "create table") {
    const name = st.name.name;
    await db.exec(sql);
    const rows = await tableColumns(db, name);
    const frame: Frame = {
      clause: "CREATE TABLE",
      note: `CREATE TABLE made ${name} with ${plural(rows.length, "column")} and no rows yet.`,
      columns: COLUMN_HEADS,
      rows,
      total: rows.length,
    };
    return { supported: true, frames: [frame] };
  }
  if (st.type === "alter table") return alterFrames(db, st.table.name, st.changes as unknown as AlterChange[], sql);
  if (st.type === "create index") return indexFrames(db, st.table.name, sql);
  if (st.type === "drop table") return dropFrames(db, "TABLE", st.names.map((n) => n.name), sql);
  return null;
}

type AlterChange = { type: string; column?: { name: string }; to?: { name: string } };

/** ALTER TABLE: the columns before, the columns after (new, changed or gone), then the rows and what they got. */
async function alterFrames(db: Db, name: string, changes: AlterChange[], sql: string): Promise<Replay> {
  const before = await tableColumns(db, name);
  const rowCount = Number((await db.query(`SELECT count(*) FROM ${ident(name)}`)).rows[0]?.[0]);
  await db.exec(sql);
  const now = changes.find((c) => c.type === "rename")?.to?.name ?? name;
  const after = await tableColumns(db, now);
  const renames = changes.filter((c) => c.type === "rename column" && c.column && c.to).map((c) => [c.column!.name, c.to!.name] as const);
  const was = (n: unknown) => renames.find(([, to]) => to === n)?.[0] ?? n;
  const beforeNames = before.map((r) => r[0]);
  const afterNames = after.map((r) => was(r[0]));
  const added = after.filter((r) => !beforeNames.includes(was(r[0]))).map((r) => String(r[0]));
  const dropped = before.filter((r) => !afterNames.includes(r[0])).map((r) => String(r[0]));
  const changed = after
    .filter((r) => { const b = before.find((x) => x[0] === was(r[0])); return b && (b[1] !== r[1] || b[2] !== r[2]); })
    .map((r) => String(r[0]));

  const parts = [
    ...(now !== name ? [`renamed ${name} to ${now}`] : []),
    ...renames.map(([from, to]) => `renamed ${from} to ${to}`),
    ...(added.length ? [`added ${listing(added)} to ${now}`] : []),
    ...(dropped.length ? [`dropped ${listing(dropped)} from ${now}`] : []),
    ...(changed.length ? [`changed the rules of ${listing(changed)}`] : []),
  ];
  const rows = await tableRows(db, now);
  const notes: string[] = [];
  for (const col of added) {
    const r = (await db.query(`SELECT count(*), count(${ident(col)}), count(DISTINCT ${ident(col)}), min(${ident(col)})::text FROM ${ident(now)}`)).rows[0] ?? [];
    const [total, filled, kinds, value] = [Number(r[0]), Number(r[1]), Number(r[2]), r[3]];
    if (!total) notes.push(`${now} has no rows yet.`);
    else if (!filled) notes.push(`All ${total} rows have NULL in ${col}, because it has no default.`);
    else if (kinds === 1 && filled === total) notes.push(`All ${total} rows got ${col} = ${value}.`);
    else notes.push(`${col} has values in ${filled} of ${total} rows.`);
  }
  if (!added.length) {
    if (dropped.length) notes.push(`Its ${plural(rows.total, "row")} lost their ${listing(dropped)} values for good.`);
    else if (renames.length || now !== name) notes.push(`Its ${plural(rows.total, "row")} keep their values under the new name.`);
    else notes.push(`All ${plural(rows.total, "row")} pass the new rules.`);
  }
  const frames: Frame[] = [
    {
      clause: "BEFORE",
      note: `${name} has ${plural(before.length, "column")} and ${plural(rowCount, "row")}.`,
      columns: COLUMN_HEADS,
      rows: before,
      total: before.length,
      marks: before.map((r): Mark => (dropped.includes(String(r[0])) ? "gone" : "plain")),
    },
    {
      clause: "ALTER TABLE",
      note: `ALTER TABLE ${parts.join("; ") || `left ${now} as it was`}.`,
      columns: COLUMN_HEADS,
      rows: after,
      total: after.length,
      marks: after.map((r): Mark => (added.includes(String(r[0])) ? "new" : changed.includes(String(r[0])) ? "changed" : "plain")),
    },
    { clause: "AFTER", note: notes.join(" "), columns: rows.columns, rows: rows.rows, total: rows.total },
  ];
  return { supported: true, frames };
}

async function primaryKeyOf(db: Db, table: string): Promise<string[]> {
  const key = await db.query(
    `SELECT a.attname::text FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = ${regclass(table)} AND i.indisprimary ORDER BY array_position(i.indkey::int2[], a.attnum)`,
  );
  return key.rows.map((r) => String(r[0]));
}

/** CREATE INDEX: the table as stored, then the index's entries in sorted order, each pointing at its row. */
async function indexFrames(db: Db, table: string, sql: string): Promise<Replay> {
  const existing = new Set((await db.query(`SELECT indexrelid::int FROM pg_index WHERE indrelid = ${regclass(table)}`)).rows.map((r) => Number(r[0])));
  const stored = await db.query(`SELECT * FROM ${ident(table)} ORDER BY ctid LIMIT 200`);
  const total = Number((await db.query(`SELECT count(*) FROM ${ident(table)}`)).rows[0]?.[0]);
  await db.exec(sql);
  const made = (await db.query(`SELECT indexrelid::int, indisunique, pg_get_expr(indpred, indrelid), indnkeyatts FROM pg_index WHERE indrelid = ${regclass(table)}`)).rows.find((r) => !existing.has(Number(r[0])));
  if (!made) return { supported: false, reason: "The replay couldn't find the new index; the result is on the right." };
  const [oid, unique, predicate, width] = [Number(made[0]), made[1] === true, made[2] as string | null, Number(made[3])];
  const keys = (await db.query(`SELECT pg_get_indexdef(${oid}, n, true) FROM generate_series(1, ${width}) AS n ORDER BY n`)).rows.map((r) => String(r[0]));
  const pk = await primaryKeyOf(db, table);
  const pointer = pk.length ? `concat_ws(', ', ${pk.map(ident).join(", ")})` : "ctid::text";
  const entries = await db.query(
    `SELECT ${keys.map((k, i) => `${k} AS ${ident(`k${i}`)}`).join(", ")}, ${pointer} AS ptr FROM ${ident(table)}${predicate ? ` WHERE ${predicate}` : ""} ORDER BY ${keys.join(", ")} LIMIT 200`,
  );
  const count = Number((await db.query(`SELECT count(*) FROM ${ident(table)}${predicate ? ` WHERE ${predicate}` : ""}`)).rows[0]?.[0]);
  const frames: Frame[] = [
    {
      clause: "BEFORE",
      note: `Without an index, a WHERE on ${keys[0]} reads all ${plural(total, "row")} of ${table} to find its matches.`,
      columns: stored.fields.map((f) => f.name),
      rows: stored.rows,
      total,
    },
    {
      clause: "CREATE INDEX",
      note:
        `CREATE INDEX keeps ${listing(keys)} sorted, each entry pointing at its row: ${plural(count, "entry", "entries")}. A WHERE on ${keys[0]} can jump to its matches instead of reading every row.` +
        (unique ? ` UNIQUE also turns away a second row with the same ${listing(keys)}.` : "") +
        (predicate ? ` It only holds rows where ${predicate}.` : ""),
      columns: [...keys, `row (${pk.length ? pk.join(", ") : "ctid"})`],
      rows: entries.rows,
      total: count,
    },
  ];
  return { supported: true, frames };
}

const KIND: Record<string, string> = { r: "table", v: "view", m: "materialized view" };

/** The database's tables and views: name, kind, rows, and the tables each one points at. */
async function relations(db: Db): Promise<unknown[][]> {
  const r = await db.query(
    `SELECT c.relname::text, c.relkind::text,
            (SELECT string_agg(k.confrelid::regclass::text, ', ' ORDER BY k.confrelid::regclass::text) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'f')
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm') ORDER BY c.relname`,
  );
  const out: unknown[][] = [];
  for (const [name, kind, points] of r.rows) {
    const rows = Number((await db.query(`SELECT count(*) FROM ${ident(String(name))}`)).rows[0]?.[0]);
    out.push([name, KIND[String(kind)] ?? String(kind), rows, points ?? ""]);
  }
  return out;
}

/** DROP TABLE: the tables and views before (what goes is marked), then after, and what CASCADE took. */
export async function dropFrames(db: Db, what: "TABLE" | "VIEW", named: string[], sql: string): Promise<Replay> {
  const before = await relations(db);
  const links = async () => (await db.query(`SELECT conrelid::regclass::text, confrelid::regclass::text FROM pg_constraint WHERE contype = 'f'`)).rows.map((r) => [String(r[0]), String(r[1])] as const);
  const linksBefore = await links();
  await db.exec(sql);
  const after = await relations(db);
  const left = new Set(after.map((r) => String(r[0])));
  const gone = before.filter((r) => !left.has(String(r[0])));
  const also = gone.filter((r) => !named.includes(String(r[0])));
  const lost = linksBefore.filter(([from, to]) => left.has(from) && !left.has(to));
  const dropped = gone.filter((r) => named.includes(String(r[0]))).map((r) => String(r[0]));
  const parts = [dropped.length ? `DROP ${what} removed ${listing(dropped)}.` : `DROP ${what} found nothing called ${listing(named)}, so nothing changed.`];
  if (also.length) parts.push(`CASCADE also removed ${listing(also.map((r) => `the ${r[1]} ${r[0]}`))}, which depended on it.`);
  if (lost.length) {
    const stays = [...new Set(lost.map(([from]) => from))];
    parts.push(`CASCADE also removed the link${lost.length === 1 ? "" : "s"} from ${listing(lost.map(([from, to]) => `${from} to ${to}`))}; ${listing(stays)} ${stays.length === 1 ? "stays" : "stay"}.`);
  }
  const heads = ["name", "kind", "rows", "points at"];
  const frames: Frame[] = [
    { clause: "BEFORE", note: `The shop has ${plural(before.length, "table or view", "tables and views")} before the DROP.`, columns: heads, rows: before, total: before.length, marks: before.map((r): Mark => (left.has(String(r[0])) ? "plain" : "gone")) },
    { clause: what === "TABLE" ? "DROP TABLE" : "DROP VIEW", note: parts.join(" "), columns: heads, rows: after, total: after.length },
  ];
  return { supported: true, frames };
}
