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
  // How the three columns are divided, as PERCENTAGES of their group —
  // react-resizable-panels speaks in percent (its Layout is a map of panel id
  // to 0..100), and unlike a pixel width a percentage survives the window
  // being resized. Bounds are what still leaves a usable column on both sides;
  // the defaults land within a few pixels of the prototype's 248 / 352 at a
  // ~1440px window.
  leftRailPct: z.number().min(8).max(40).default(18),
  rightRailPct: z.number().min(12).max(45).default(25),
  // The map's share of the right column, the rest going to the widget stack.
  mapPanePct: z.number().min(15).max(85).default(45),
});

export type GuideUiRecord = z.infer<typeof guideUiRecord>;
