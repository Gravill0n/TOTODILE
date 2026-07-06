import { useCallback, useEffect, useState } from "react";
import {
  clearLayerVerdict,
  type LayerVerdict,
  putLayerVerdict,
  readGuideVerdicts,
} from "./reviewStore";

export type GuideVerdicts = {
  // layerId → the draft approve/reject decision. Empty until the store loads.
  byLayer: Map<string, LayerVerdict>;
  record: (
    layerId: string,
    status: LayerVerdict["status"],
    note?: string,
  ) => void;
  clear: (layerId: string) => void;
  // Group verdicts (T5b): one decision fans out to every member — a single
  // shared date/note and one state update, so N members never render as N
  // half-applied verdicts.
  recordAll: (
    layerIds: string[],
    status: LayerVerdict["status"],
    note?: string,
  ) => void;
  clearAll: (layerIds: string[]) => void;
};

// Owns a guide's draft approve/reject decisions (FR-E4), loaded on mount and
// written through immediately — same discipline as useSpotChecks.
export function useLayerVerdicts(guideId: string): GuideVerdicts {
  const [byLayer, setByLayer] = useState<Map<string, LayerVerdict>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void readGuideVerdicts(guideId).then((loaded) => {
      if (!cancelled) setByLayer(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [guideId]);

  const recordAll = useCallback(
    (layerIds: string[], status: LayerVerdict["status"], note?: string) => {
      const verdict: LayerVerdict = {
        status,
        date: new Date().toISOString(),
        ...(note?.trim() ? { note: note.trim() } : {}),
      };
      setByLayer((previous) => {
        const next = new Map(previous);
        for (const layerId of layerIds) next.set(layerId, verdict);
        return next;
      });
      for (const layerId of layerIds) {
        void putLayerVerdict(guideId, layerId, verdict);
      }
    },
    [guideId],
  );

  const clearAll = useCallback(
    (layerIds: string[]) => {
      setByLayer((previous) => {
        const next = new Map(previous);
        for (const layerId of layerIds) next.delete(layerId);
        return next;
      });
      for (const layerId of layerIds) {
        void clearLayerVerdict(guideId, layerId);
      }
    },
    [guideId],
  );

  const record = useCallback(
    (layerId: string, status: LayerVerdict["status"], note?: string) =>
      recordAll([layerId], status, note),
    [recordAll],
  );

  const clear = useCallback(
    (layerId: string) => clearAll([layerId]),
    [clearAll],
  );

  return { byLayer, record, clear, recordAll, clearAll };
}
