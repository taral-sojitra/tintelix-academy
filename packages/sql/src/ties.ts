import { parse, toSql, type Expr, type SelectFromStatement, type Statement } from "pgsql-ast-parser";
import { normalise } from "./compare";
import type { Db } from "./db";

type Node = { type?: string; name?: string; table?: unknown; value?: number };

/**
 * How many rows tie with the row before them on every ORDER BY key (LIMIT and OFFSET ignored).
 * A build check: an ordered task's answer must sort to one order only, or a right answer could come back
 * in a different order and fail.
 */
export async function sortTies(db: Db, sql: string): Promise<number> {
  const ast = parse(sql)[0];
  let select: Statement | undefined;
  let wrap: (s: SelectFromStatement) => Statement;
  if (ast?.type === "with") {
    select = ast.in;
    wrap = (s) => ({ ...ast, in: s });
  } else {
    select = ast;
    wrap = (s) => s;
  }
  if (select?.type !== "select" || !select.orderBy?.length) throw new Error("sortTies: no ORDER BY to check");
  const cols = select.columns ?? [];
  const keys = select.orderBy.map((o, i) => {
    let by = o.by as unknown as Node;
    if (by.type === "integer") by = (cols[(by.value ?? 0) - 1]?.expr ?? by) as unknown as Node;
    else if (by.type === "ref" && !by.table) {
      const named = cols.find((c) => c.alias?.name === by.name);
      if (named) by = named.expr as unknown as Node;
    }
    return { expr: by as unknown as Expr, alias: { name: `__k${i}` } };
  });
  const probe = toSql.statement(wrap({ ...select, columns: [...cols, ...keys], limit: undefined }));
  const { rows } = await db.query(probe);
  let ties = 0;
  let previous = "";
  rows.forEach((r, i) => {
    const key = JSON.stringify(r.slice(r.length - keys.length).map(normalise));
    if (i > 0 && key === previous) ties++;
    previous = key;
  });
  return ties;
}
