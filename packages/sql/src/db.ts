import type { PGlite } from "@electric-sql/pglite";

export interface QueryResult {
  fields: { name: string; dataTypeID: number }[];
  rows: unknown[][];
  affectedRows?: number;
}

/** The little the engine needs from a database, so Node tests and the browser worker share the code. */
export interface Db {
  query(sql: string): Promise<QueryResult>;
  /** Runs one or more statements; one result per statement. */
  exec(sql: string): Promise<QueryResult[]>;
  close?(): Promise<void>;
}

export function pgliteDb(pg: PGlite): Db {
  return {
    async query(sql) {
      const r = await pg.query<unknown[]>(sql, [], { rowMode: "array" });
      return { fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })), rows: r.rows, affectedRows: r.affectedRows };
    },
    async exec(sql) {
      const rs = await pg.exec(sql, { rowMode: "array" });
      return rs.map((r) => ({ fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })), rows: r.rows as unknown[][], affectedRows: r.affectedRows }));
    },
    close: () => pg.close(),
  };
}
