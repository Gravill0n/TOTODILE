import { type IDBPDatabase, openDB } from "idb";
import type { SpotCheckVerdict } from "@/schema";

// Editor-only review working state — spot-check verdicts recorded before a
// layer is approved (FR-E3). It lives in its own IndexedDB database, separate
// from player progress (totodile/progress): it is never exported with progress
// and the Task 4 approval flow reads it to bake spotChecks into the generated
// approvals.json (the only writer of that file, §23.4).
const DB_NAME = "totodile-review";
const STORE = "spotChecks";
const VERDICT_STORE = "layerVerdicts";

// One row per spot-check verdict. The composite key keeps an upsert to a single
// (guide, layer, item) a plain put, and lets a guide's verdicts be read in one
// sweep.
type SpotCheckRecord = {
  id: string;
  guideId: string;
  layerId: string;
  itemId: string;
  verdict: SpotCheckVerdict["verdict"];
  note?: string;
};

// A draft approve/reject decision for one layer (Task 4), held here until the
// editor exports approvals.json. Mirrors the eventual approvalRecord.
export type LayerVerdict = {
  status: "approved" | "rejected";
  note?: string;
  date: string;
};

type LayerVerdictRecord = {
  id: string;
  guideId: string;
  layerId: string;
  status: LayerVerdict["status"];
  note?: string;
  date: string;
};

let dbPromise: Promise<IDBPDatabase> | undefined;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore(STORE, { keyPath: "id" });
      }
      if (oldVersion < 2) {
        database.createObjectStore(VERDICT_STORE, { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

function recordId(guideId: string, layerId: string, itemId: string): string {
  return `${guideId}|${layerId}|${itemId}`;
}

function layerKey(guideId: string, layerId: string): string {
  return `${guideId}|${layerId}`;
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

// Every recorded layer verdict for one guide, keyed by layerId (Task 4).
export async function readGuideVerdicts(
  guideId: string,
): Promise<Map<string, LayerVerdict>> {
  const all = (await (
    await db()
  ).getAll(VERDICT_STORE)) as LayerVerdictRecord[];
  const byLayer = new Map<string, LayerVerdict>();
  for (const row of all) {
    if (row.guideId !== guideId) continue;
    byLayer.set(row.layerId, {
      status: row.status,
      date: row.date,
      ...(row.note !== undefined ? { note: row.note } : {}),
    });
  }
  return byLayer;
}

export async function putLayerVerdict(
  guideId: string,
  layerId: string,
  verdict: LayerVerdict,
): Promise<void> {
  const record: LayerVerdictRecord = {
    id: layerKey(guideId, layerId),
    guideId,
    layerId,
    status: verdict.status,
    date: verdict.date,
    ...(verdict.note !== undefined ? { note: verdict.note } : {}),
  };
  await (await db()).put(VERDICT_STORE, record);
}

export async function clearLayerVerdict(
  guideId: string,
  layerId: string,
): Promise<void> {
  await (await db()).delete(VERDICT_STORE, layerKey(guideId, layerId));
}

// Drops the cached connection so the next call reopens the database — tests
// use this to prove verdicts persist across connections.
export async function closeReviewDb(): Promise<void> {
  const open = dbPromise;
  dbPromise = undefined;
  if (open) (await open).close();
}
