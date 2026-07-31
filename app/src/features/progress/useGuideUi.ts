import { useCallback, useEffect, useState } from "react";
import type { GuideUiRecord } from "@/schema";
import type { MapView } from "@/types/mapView";
import { emptyGuideUi, readGuideUi, writeGuideUi } from "./guideUiStore";

// The map panel offers 100%–400%; the schema pins the same range.
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// How far the map is zoomed and where it is scrolled travel together: zooming
// around a point moves both, so the panel computes the view and hands it over
// whole and a zoom press is one write, not two.
export type { MapView };

// How the three columns are divided, as percentages of their group.
export type RailLayout = {
  leftRailPct: number;
  rightRailPct: number;
  mapPanePct: number;
};

export type GuideUi = {
  // False until the stored record has landed. Renderers don't need to wait —
  // the defaults are already the right answer for a guide never arranged — but
  // tests do, to avoid recording a change the initial load would clobber.
  hydrated: boolean;
  widgetOrder: readonly string[];
  pinnedWidgetIds: readonly string[];
  /** Where each map was left, keyed by image src. */
  mapViews: Readonly<Record<string, MapView>>;
  leftRailPct: number;
  rightRailPct: number;
  mapPanePct: number;
  setWidgetOrder: (widgetIds: string[]) => void;
  togglePinned: (widgetId: string) => void;
  setMapView: (src: string, view: MapView) => void;
  setRailLayout: (layout: Partial<RailLayout>) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Owns the per-guide UI arrangement, mirroring useGuideProgress: state lives at
// the screen level and every change is written immediately, so the stack stays
// arranged the way the player left it. Unlike progress there is no `ready`
// gate — an unarranged guide and an unloaded one look the same, so rendering
// can start from the defaults.
export function useGuideUi(guideId: string): GuideUi {
  const [record, setRecord] = useState<GuideUiRecord>(() =>
    emptyGuideUi(guideId),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setRecord(emptyGuideUi(guideId));
    void readGuideUi(guideId).then((loaded) => {
      if (cancelled) return;
      setRecord(loaded);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [guideId]);

  const update = useCallback(
    (change: (record: GuideUiRecord) => GuideUiRecord) => {
      setRecord((previous) => {
        const next = change(previous);
        void writeGuideUi(next);
        return next;
      });
    },
    [],
  );

  const setWidgetOrder = useCallback(
    (widgetIds: string[]) =>
      update((record) => ({ ...record, widgetOrder: widgetIds })),
    [update],
  );

  const togglePinned = useCallback(
    (widgetId: string) =>
      update((record) => ({
        ...record,
        pinnedWidgetIds: record.pinnedWidgetIds.includes(widgetId)
          ? record.pinnedWidgetIds.filter((id) => id !== widgetId)
          : [...record.pinnedWidgetIds, widgetId],
      })),
    [update],
  );

  // A partial, because the horizontal group and the nested vertical one report
  // their layouts separately — one drag must not clobber the other's sizes.
  const setRailLayout = useCallback(
    (layout: Partial<RailLayout>) =>
      update((record) => ({
        ...record,
        leftRailPct: clamp(layout.leftRailPct ?? record.leftRailPct, 8, 40),
        rightRailPct: clamp(layout.rightRailPct ?? record.rightRailPct, 12, 45),
        mapPanePct: clamp(layout.mapPanePct ?? record.mapPanePct, 15, 85),
      })),
    [update],
  );

  // Keyed by the map's own image src: switching between a place's maps
  // restores each one where it was left rather than dragging the previous
  // map's corner onto a differently-shaped picture.
  const setMapView = useCallback(
    (src: string, view: MapView) =>
      update((record) => ({
        ...record,
        mapViews: {
          ...record.mapViews,
          [src]: {
            zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM),
            panX: clamp(view.panX, 0, 1),
            panY: clamp(view.panY, 0, 1),
          },
        },
      })),
    [update],
  );

  return {
    hydrated,
    widgetOrder: record.widgetOrder,
    pinnedWidgetIds: record.pinnedWidgetIds,
    mapViews: record.mapViews,
    leftRailPct: record.leftRailPct,
    rightRailPct: record.rightRailPct,
    mapPanePct: record.mapPanePct,
    setWidgetOrder,
    togglePinned,
    setMapView,
    setRailLayout,
  };
}
