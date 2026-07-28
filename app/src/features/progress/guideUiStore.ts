import type { GuideUiRecord } from "@/schema";
import { closeDb, db, GUIDE_UI_STORE as STORE } from "./db";

// The per-guide UI arrangement (design v2) — one record per guide, beside the
// progress slot but never inside it, so the progress export stays save data.
export type { GuideUiRecord } from "@/schema";

export function emptyGuideUi(guideId: string): GuideUiRecord {
  return { guideId, widgetOrder: [], pinnedWidgetIds: [], mapZoom: 1 };
}

// Same implicit forward migration as the progress slot: spreading over the
// empty record defaults preferences added after a record was first written.
function migrated(record: GuideUiRecord): GuideUiRecord {
  return { ...emptyGuideUi(record.guideId), ...record };
}

export async function readGuideUi(guideId: string): Promise<GuideUiRecord> {
  const record = (await (await db()).get(STORE, guideId)) as
    | GuideUiRecord
    | undefined;
  return record ? migrated(record) : emptyGuideUi(guideId);
}

export async function writeGuideUi(record: GuideUiRecord): Promise<void> {
  await (await db()).put(STORE, record);
}

// The same connection the progress store uses; re-exported so a test that only
// touches guideUi doesn't have to reach into the progress module.
export const closeGuideUiDb = closeDb;
