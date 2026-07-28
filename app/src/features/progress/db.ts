import { createLazyDb } from "@/lib/idb";

// The one browser database the play view writes to. Two stores, both keyed by
// guide id: `progress` is the save data (§6.8, FR-B7), `guideUi` is the local
// arrangement of the widget stack and the map zoom (design v2). They share a
// connection so the version — and the upgrade — stays in one place.
const DB_NAME = "totodile";
export const PROGRESS_STORE = "progress";
export const GUIDE_UI_STORE = "guideUi";

// v1 → v2 only ADDS guideUi; nothing in `progress` is read, rewritten or
// deleted, so an existing save survives the upgrade untouched. Both creates are
// guarded by name, so opening at v2 from either version lands on one shape.
const lazy = createLazyDb(DB_NAME, 2, (database) => {
  if (!database.objectStoreNames.contains(PROGRESS_STORE)) {
    database.createObjectStore(PROGRESS_STORE, { keyPath: "guideId" });
  }
  if (!database.objectStoreNames.contains(GUIDE_UI_STORE)) {
    database.createObjectStore(GUIDE_UI_STORE, { keyPath: "guideId" });
  }
});

export const db = lazy.db;

// Drops the cached connection so the next call reopens the database. Used by
// tests to prove persistence across connections; both stores re-export it under
// their own name.
export const closeDb = lazy.close;
