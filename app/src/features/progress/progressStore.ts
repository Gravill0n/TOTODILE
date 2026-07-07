import { type IDBPDatabase, openDB } from "idb";
import type { ProgressSlot } from "../schema";

// §6.8 browser-side progress slots on IndexedDB — exactly one per guide
// (FR-B7), never in the repo. The record shape is the schema's
// progressSlot (§22.1: types come from Zod, the export file is contract).
export type { ItemState, ProgressSlot } from "../schema";

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
    acknowledgedMissables: [],
    stats: { stepsDone: 0, stepsTotal: 0, currentChapterTitle: null },
    lastActivityAt: new Date().toISOString(),
  };
}

// Spreading over the empty slot defaults fields added after a slot was
// first written (e.g. counterValues, stats) — implicit forward migration.
function migrated(slot: ProgressSlot): ProgressSlot {
  return { ...emptySlot(slot.guideId), ...slot };
}

export async function readSlot(guideId: string): Promise<ProgressSlot> {
  const slot = (await (await db()).get(STORE, guideId)) as
    | ProgressSlot
    | undefined;
  return slot ? migrated(slot) : emptySlot(guideId);
}

export async function readAllSlots(): Promise<ProgressSlot[]> {
  const slots = (await (await db()).getAll(STORE)) as ProgressSlot[];
  return slots.map(migrated);
}

export async function writeSlot(slot: ProgressSlot): Promise<void> {
  await (await db()).put(STORE, slot);
}

// Import replaces slots wholesale per guide (§12.4 scenario 3: identical
// state on the other device) in one transaction — a failed import writes
// nothing (§22.4).
export async function importSlots(slots: ProgressSlot[]): Promise<void> {
  const tx = (await db()).transaction(STORE, "readwrite");
  for (const slot of slots) {
    void tx.store.put(slot);
  }
  await tx.done;
}

// Drops the cached connection so the next call reopens the database.
// Used by tests to prove persistence across connections.
export async function closeProgressDb(): Promise<void> {
  const open = dbPromise;
  dbPromise = undefined;
  if (open) (await open).close();
}
