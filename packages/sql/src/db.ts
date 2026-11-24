import type { PGlite } from "@electric-sql/pglite";

export interface QueryResult {
  fields: { name: string; dataTypeID: number }[];
  rows: unknown[][];
  affectedRows?: number;
}

/** The little the engine needs from a database, so Node tests and the browser worker share the code. */
export interface Db {
  query(sql: string): Promise<QueryResult>;
  exec(sql: string): Promise<void>;
  close?(): Promise<void>;
}

export function pgliteDb(pg: PGlite): Db {
  return {
    async query(sql) {
      const r = await pg.query<unknown[]>(sql, [], { rowMode: "array" });
      return { fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })), rows: r.rows, affectedRows: r.affectedRows };
    },
    async exec(sql) {
      await pg.exec(sql);
    },
    close: () => pg.close(),
  };
}
