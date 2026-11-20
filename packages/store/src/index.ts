import { wrap, type DBSchema, type IDBPDatabase } from "idb";

export interface LessonProgress {
  lessonId: string;
  furthestStep: number;
  lastStep: number;
  done: boolean;
  updatedAt: string;
}

export interface Store {
  getProgress(id: string): Promise<LessonProgress | null>;
  allProgress(): Promise<LessonProgress[]>;
  saveStep(id: string, step: number, total: number): Promise<void>;
  getPref<T>(key: string, fallback: T): Promise<T>;
  setPref(key: string, value: unknown): Promise<void>;
}

interface TintelixDB extends DBSchema {
  progress: { key: string; value: LessonProgress };
  prefs: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "tintelix";
const DB_VERSION = 1;

const OPEN_TIMEOUT_MS = 1500;

/** The browser's IndexedDB, or null. Reading the global can itself throw when storage is blocked. */
function globalFactory(): IDBFactory | null {
  try {
    return typeof indexedDB === "undefined" ? null : indexedDB;
  } catch {
    return null;
  }
}

function open(factory: IDBFactory | null, timeoutMs: number): Promise<IDBPDatabase<TintelixDB> | null> {
  try {
    if (!factory) return Promise.resolve(null);
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "lessonId" });
      if (!db.objectStoreNames.contains("prefs")) db.createObjectStore("prefs", { keyPath: "key" });
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const opened = (wrap(request) as unknown as Promise<IDBPDatabase<TintelixDB>>).then((db) => {
      clearTimeout(timer);
      // A newer version of the site in another tab needs this connection closed to upgrade.
      db.addEventListener("versionchange", () => db.close());
      return db;
    });
    const gaveUp = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    return Promise.race([opened, gaveUp]).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Progress and preferences on this device. Storage can be missing or blocked (private browsing,
 * strict settings): then every read returns its empty value and every write quietly does nothing,
 * so lessons still play. A database that has not opened after `openTimeoutMs` counts as missing.
 * Pass `null` to run with no storage at all; leave it out to use the browser's IndexedDB.
 */
export function openStore(factory?: IDBFactory | null, opts: { openTimeoutMs?: number } = {}): Store {
  let dbp: Promise<IDBPDatabase<TintelixDB> | null> | null = null;
  const db = () => (dbp ??= open(factory === undefined ? globalFactory() : factory, opts.openTimeoutMs ?? OPEN_TIMEOUT_MS));
  const safe = async <T>(fallback: T, fn: (d: IDBPDatabase<TintelixDB>) => Promise<T>): Promise<T> => {
    try {
      const d = await db();
      return d ? await fn(d) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    getProgress: (id) => safe(null, async (d) => (await d.get("progress", id)) ?? null),
    allProgress: () => safe([], (d) => d.getAll("progress")),
    saveStep: (id, step, total) =>
      safe(undefined, async (d) => {
        const tx = d.transaction("progress", "readwrite");
        const prev = await tx.store.get(id);
        await tx.store.put({
          lessonId: id,
          lastStep: step,
          furthestStep: Math.max(step, prev?.furthestStep ?? 0),
          done: (prev?.done ?? false) || step >= total - 1,
          updatedAt: new Date().toISOString(),
        });
        await tx.done;
      }),
    getPref: <T>(key: string, fallback: T) => safe(fallback, async (d) => ((await d.get("prefs", key))?.value as T | undefined) ?? fallback),
    setPref: (key, value) =>
      safe(undefined, async (d) => {
        await d.put("prefs", { key, value });
      }),
  };
}
