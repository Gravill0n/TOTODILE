import { useCallback, useEffect, useState } from "react";
import type { SpotCheckVerdict } from "../schema";
import {
  clearSpotCheck,
  putSpotCheck,
  readGuideSpotChecks,
} from "./reviewStore";

export type GuideSpotChecks = {
  // layerId → (itemId → verdict). Empty until the store has loaded.
  byLayer: Map<string, Map<string, SpotCheckVerdict>>;
  record: (layerId: string, verdict: SpotCheckVerdict) => void;
  clear: (layerId: string, itemId: string) => void;
};

// Owns a guide's recorded spot-check verdicts (FR-E3), loaded from the review
// store on mount and written through immediately on each verdict — the same
// discipline as useGuideProgress, for editor working state.
export function useSpotChecks(guideId: string): GuideSpotChecks {
  const [byLayer, setByLayer] = useState<
    Map<string, Map<string, SpotCheckVerdict>>
  >(new Map());

  useEffect(() => {
    let cancelled = false;
    void readGuideSpotChecks(guideId).then((loaded) => {
      if (!cancelled) setByLayer(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [guideId]);

  const record = useCallback(
    (layerId: string, verdict: SpotCheckVerdict) => {
      setByLayer((previous) => {
        const next = new Map(previous);
        const layer = new Map(next.get(layerId) ?? []);
        layer.set(verdict.itemId, verdict);
        next.set(layerId, layer);
        return next;
      });
      void putSpotCheck(guideId, layerId, verdict);
    },
    [guideId],
  );

  const clear = useCallback(
    (layerId: string, itemId: string) => {
      setByLayer((previous) => {
        const next = new Map(previous);
        const layer = new Map(next.get(layerId) ?? []);
        layer.delete(itemId);
        next.set(layerId, layer);
        return next;
      });
      void clearSpotCheck(guideId, layerId, itemId);
    },
    [guideId],
  );

  return { byLayer, record, clear };
}
