import { z } from "zod";
import { guideSlug, widgetId } from "./common.ts";

// Per-guide UI arrangement (design v2): how the player has arranged the widget
// stack and how far they have zoomed the map. Deliberately NOT part of
// progressSlot — the progress export is save data (§8.2, FR-B6), and where the
// map happens to be zoomed is not something to carry between devices. Lives in
// its own IndexedDB store; nothing here ever reaches the repo.
export const guideUiRecord = z.object({
  guideId: guideSlug,
  // Widget ids in the order the player dragged them. Widgets missing from this
  // list fall back to their deckPosition, so a recompiled guide that adds a
  // widget appends it instead of dropping the arrangement.
  widgetOrder: z.array(widgetId).default([]),
  pinnedWidgetIds: z.array(widgetId).default([]),
  // A multiplier: 1 = 100%, 4 = 400% — the range the map panel offers.
  mapZoom: z.number().min(1).max(4).default(1),
});

export type GuideUiRecord = z.infer<typeof guideUiRecord>;
