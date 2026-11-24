/// <reference lib="webworker" />
import { PGlite } from "@electric-sql/pglite";
import type { SqlTask } from "@tintelix/schema";
import { buildReplay, checkSqlTask, pgliteDb, runInRollback, SHOP_SQL, type Db } from "@tintelix/sql";

/** Runs PGlite off the main thread: one shop database, one request at a time. */

type Request = { id: number; op: "warm" | "run" | "check" | "replay"; sql?: string; task?: SqlTask };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let db: Promise<Db> | null = null;
const open = () => (db ??= PGlite.create().then(async (pg) => {
  await pg.exec(SHOP_SQL);
  return pgliteDb(pg);
}));

async function handle({ op, sql = "", task }: Request): Promise<unknown> {
  const shop = await open();
  if (op === "warm") return true;
  if (op === "run") return (await runInRollback(shop, sql)).outcome;
  if (op === "check") return checkSqlTask(shop, task!, sql);
  return buildReplay(shop, sql);
}

let chain: Promise<unknown> = Promise.resolve();
scope.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data;
  chain = chain.then(async () => {
    try {
      scope.postMessage({ id: req.id, ok: true, data: await handle(req) });
    } catch (err) {
      scope.postMessage({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
};
