import { openStore, type Store } from "@tintelix/store";

let shared: Store | null = null;

/** One store, and so one database connection, for the whole page. */
export function getStore(): Store {
  return (shared ??= openStore());
}
