import { useCallback, useEffect, useState } from "react";
import type { GuideUiRecord } from "@/schema";
import { emptyGuideUi, readGuideUi, writeGuideUi } from "./guideUiStore";

// The map panel offers 100%–400%; the schema pins the same range.
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// How far the map is zoomed and where it is scrolled. One value, because
// zooming around a point moves both — the panel computes the view and hands it
// over whole, so a zoom press is one write, not two.
export type MapView = {
  zoom: number;
  panX: number;
  panY: number;
};

export type GuideUi = {
  // False until the stored record has landed. Renderers don't need to wait —
  // the defaults are already the right answer for a guide never arranged — but
  // tests do, to avoid recording a change the initial load would clobber.
  hydrated: boolean;
  widgetOrder: readonly string[];
  pinnedWidgetIds: readonly string[];
  mapZoom: number;
  mapPanX: number;
  mapPanY: number;
  setWidgetOrder: (widgetIds: string[]) => void;
  togglePinned: (widgetId: string) => void;
  setMapView: (view: MapView) => void;
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

  const setMapView = useCallback(
    (view: MapView) =>
      update((record) => ({
        ...record,
        mapZoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM),
        mapPanX: clamp(view.panX, 0, 1),
        mapPanY: clamp(view.panY, 0, 1),
      })),
    [update],
  );

  return {
    hydrated,
    widgetOrder: record.widgetOrder,
    pinnedWidgetIds: record.pinnedWidgetIds,
    mapZoom: record.mapZoom,
    mapPanX: record.mapPanX,
    mapPanY: record.mapPanY,
    setWidgetOrder,
    togglePinned,
    setMapView,
  };
}
