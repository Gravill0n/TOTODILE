import { type IDBPDatabase, openDB } from "idb";

// §6.8 browser-side progress slot — exactly one per guide (FR-B7), never in
// the repo. Task 2 ships the pointer + done states; skip semantics,
// counters, missable acknowledgments, and export/import complete it in
// Phase 1 Task 4 (FR-B).
export type ItemState = {
  // "skipped" joins in Task 4 (FR-B2).
  state: "done";
  at: string;
};

export type ProgressSlot = {
  guideId: string;
  // null only before the first open initializes it to the first step.
  currentStepId: string | null;
  itemStates: Record<string, ItemState>;
  // Counter item ID → current count (FR-B3). Absent = 0.
  counterValues: Record<string, number>;
  lastActivityAt: string;
};

const DB_NAME = "totodile";
const STORE = "progress";

let dbPromise: Promise<IDBPDatabase> | undefined;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: "guideId" });
    },
  });
  return dbPromise;
}

export function emptySlot(guideId: string): ProgressSlot {
  return {
    guideId,
    currentStepId: null,
    itemStates: {},
    counterValues: {},
    lastActivityAt: new Date().toISOString(),
  };
}

export async function readSlot(guideId: string): Promise<ProgressSlot> {
  const slot = (await (await db()).get(STORE, guideId)) as
    | ProgressSlot
    | undefined;
  // Spreading over the empty slot defaults fields added after a slot was
  // first written (e.g. counterValues) — implicit forward migration.
  return slot ? { ...emptySlot(guideId), ...slot } : emptySlot(guideId);
}

export async function writeSlot(slot: ProgressSlot): Promise<void> {
  await (await db()).put(STORE, slot);
}

// Drops the cached connection so the next call reopens the database.
// Used by tests to prove persistence across connections.
export async function closeProgressDb(): Promise<void> {
  const open = dbPromise;
  dbPromise = undefined;
  if (open) (await open).close();
}
