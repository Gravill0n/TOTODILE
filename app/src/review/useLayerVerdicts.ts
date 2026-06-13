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

  const record = useCallback(
    (layerId: string, status: LayerVerdict["status"], note?: string) => {
      const verdict: LayerVerdict = {
        status,
        date: new Date().toISOString(),
        ...(note?.trim() ? { note: note.trim() } : {}),
      };
      setByLayer((previous) => new Map(previous).set(layerId, verdict));
      void putLayerVerdict(guideId, layerId, verdict);
    },
    [guideId],
  );

  const clear = useCallback(
    (layerId: string) => {
      setByLayer((previous) => {
        const next = new Map(previous);
        next.delete(layerId);
        return next;
      });
      void clearLayerVerdict(guideId, layerId);
    },
    [guideId],
  );

  return { byLayer, record, clear };
}
