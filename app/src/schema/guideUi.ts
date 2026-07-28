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
  // Where the map was left, not just how far in. A multiplier — 1 = 100%,
  // 4 = 400%, the range the map panel offers — plus the scroll position.
  mapZoom: z.number().min(1).max(4).default(1),
  // The pan is a FRACTION of the scrollable extent (0 = left/top edge,
  // 1 = right/bottom edge), never pixels: the map panel is a ~320px column on
  // desktop and full-width on the phone, so a pixel offset would land somewhere
  // else on the other posture. Meaningless at zoom 1, where nothing overflows.
  mapPanX: z.number().min(0).max(1).default(0),
  mapPanY: z.number().min(0).max(1).default(0),
});

export type GuideUiRecord = z.infer<typeof guideUiRecord>;
