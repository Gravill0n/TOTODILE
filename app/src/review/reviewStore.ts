import { type IDBPDatabase, openDB } from "idb";
import type { SpotCheckVerdict } from "../schema";

// Editor-only review working state — spot-check verdicts recorded before a
// layer is approved (FR-E3). It lives in its own IndexedDB database, separate
// from player progress (totodile/progress): it is never exported with progress
// and the Task 4 approval flow reads it to bake spotChecks into the generated
// approvals.json (the only writer of that file, §23.4).
const DB_NAME = "totodile-review";
const STORE = "spotChecks";

// One row per verdict. The composite key keeps an upsert to a single (guide,
// layer, item) a plain put, and lets a guide's verdicts be read in one sweep.
type SpotCheckRecord = {
  id: string;
  guideId: string;
  layerId: string;
  itemId: string;
  verdict: SpotCheckVerdict["verdict"];
  note?: string;
};

let dbPromise: Promise<IDBPDatabase> | undefined;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: "id" });
    },
  });
  return dbPromise;
}

function recordId(guideId: string, layerId: string, itemId: string): string {
  return `${guideId}|${layerId}|${itemId}`;
}

// Every recorded verdict for one guide, grouped by layer then item — the shape
// the review screen and the Task 4 approval flow both consume.
export async function readGuideSpotChecks(
  guideId: string,
): Promise<Map<string, Map<string, SpotCheckVerdict>>> {
  const all = (await (await db()).getAll(STORE)) as SpotCheckRecord[];
  const byLayer = new Map<string, Map<string, SpotCheckVerdict>>();
  for (const row of all) {
    if (row.guideId !== guideId) continue;
    const layer = byLayer.get(row.layerId) ?? new Map();
    layer.set(row.itemId, {
      itemId: row.itemId,
      verdict: row.verdict,
      ...(row.note !== undefined ? { note: row.note } : {}),
    });
    byLayer.set(row.layerId, layer);
  }
  return byLayer;
}

// Upsert a verdict; immediate write-through, like the progress store (FR-B1
// discipline carried over to review state).
export async function putSpotCheck(
  guideId: string,
  layerId: string,
  verdict: SpotCheckVerdict,
): Promise<void> {
  const record: SpotCheckRecord = {
    id: recordId(guideId, layerId, verdict.itemId),
    guideId,
    layerId,
    itemId: verdict.itemId,
    verdict: verdict.verdict,
    ...(verdict.note !== undefined ? { note: verdict.note } : {}),
  };
  await (await db()).put(STORE, record);
}

export async function clearSpotCheck(
  guideId: string,
  layerId: string,
  itemId: string,
): Promise<void> {
  await (await db()).delete(STORE, recordId(guideId, layerId, itemId));
}

// Drops the cached connection so the next call reopens the database — tests
// use this to prove verdicts persist across connections.
export async function closeReviewDb(): Promise<void> {
  const open = dbPromise;
  dbPromise = undefined;
  if (open) (await open).close();
}
