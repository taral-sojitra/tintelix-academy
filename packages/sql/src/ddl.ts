import type { Statement } from "pgsql-ast-parser";
import type { Db } from "./db";
import type { Frame, Replay } from "./frames";
import { describeTable } from "./tables";

export { describeTable };

/** Table definitions: a verify query for define tasks, and replays for statements that make or change tables. */

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
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
  return null;
}
