import { type IDBPDatabase, type OpenDBCallbacks, openDB } from "idb";

// The lazy-connection pattern both browser stores share: open on first use,
// cache the promise, and let close() drop the cache so the next call reopens —
// tests use that to prove persistence across connections.
export type LazyDb = {
  db(): Promise<IDBPDatabase>;
  close(): Promise<void>;
};

export function createLazyDb(
  name: string,
  version: number,
  upgrade: NonNullable<OpenDBCallbacks<unknown>["upgrade"]>,
): LazyDb {
  let dbPromise: Promise<IDBPDatabase> | undefined;
  return {
    db() {
      dbPromise ??= openDB(name, version, { upgrade });
      return dbPromise;
    },
    async close() {
      const open = dbPromise;
      dbPromise = undefined;
      if (open) (await open).close();
    },
  };
}
