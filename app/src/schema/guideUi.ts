import { z } from "zod";
import { guideSlug, widgetId } from "./common.ts";

// Per-guide UI arrangement (design v2): how the player has arranged the widget
// stack and how far they have zoomed the map. Deliberately NOT part of
// progressSlot — the progress export is save data (§8.2, FR-B6), and where the
// map happens to be zoomed is not something to carry between devices. Lives in
// its own IndexedDB store; nothing here ever reaches the repo.
// Where one map was left: how far in (a multiplier — 1 = 100%, 4 = 400%, the
// range the panel offers) and which corner. The pan is a FRACTION of the
// scrollable extent (0 = left/top, 1 = right/bottom), never pixels: the panel
// is a ~320px column on desktop and full-width on the phone, so a pixel offset
// would land somewhere else on the other posture. Meaningless at zoom 1, where
// nothing overflows.
export const mapViewRecord = z.object({
  zoom: z.number().min(1).max(4).default(1),
  panX: z.number().min(0).max(1).default(0),
  panY: z.number().min(0).max(1).default(0),
});

export const guideUiRecord = z.object({
  guideId: guideSlug,
  // Widget ids in the order the player dragged them. Widgets missing from this
  // list fall back to their deckPosition, so a recompiled guide that adds a
  // widget appends it instead of dropping the arrangement.
  widgetOrder: z.array(widgetId).default([]),
  pinnedWidgetIds: z.array(widgetId).default([]),
  // Where each map was left, keyed by its image `src` — one entry per map, not
  // one per guide (2026-07-31). A place can hold nine maps now, and they are
  // different pictures: carrying Tin Tower 1F's 300% corner onto 9F put the
  // reader somewhere meaningless every time they switched. Absent key = never
  // touched = fit to the panel.
  mapViews: z.record(z.string().min(1), mapViewRecord).default({}),
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

export type MapViewRecord = z.infer<typeof mapViewRecord>;
export type GuideUiRecord = z.infer<typeof guideUiRecord>;
