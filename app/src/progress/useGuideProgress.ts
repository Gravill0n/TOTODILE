import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuideFile } from "../schema";
import { advancePointer } from "./pointer";
import { type ProgressSlot, readSlot, writeSlot } from "./progressStore";

export type GuideProgress =
  | { ready: false }
  | {
      ready: true;
      currentStepId: string | null;
      doneIds: ReadonlySet<string>;
      counterValues: Readonly<Record<string, number>>;
      toggleDone: (itemId: string) => void;
      movePointer: (stepId: string) => void;
      adjustCounter: (itemId: string, delta: number) => void;
      resetCounter: (itemId: string) => void;
    };

// Owns the progress slot for one guide. Lives at the screen level — spine
// components stay pure (data + callbacks in, UI out, §22.1). Every change
// is written immediately (FR-B1).
export function useGuideProgress(guide: GuideFile): GuideProgress {
  const stepIds = useMemo(
    () => guide.chapters.flatMap((c) => c.steps.map((s) => s.id)),
    [guide],
  );
  const [slot, setSlot] = useState<ProgressSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readSlot(guide.guideId).then((loaded) => {
      if (cancelled) return;
      // First open: the pointer starts at the first step and is stored
      // from then on (§6.7) — never re-derived.
      if (loaded.currentStepId === null && stepIds[0] !== undefined) {
        const initialized = { ...loaded, currentStepId: stepIds[0] };
        void writeSlot(initialized);
        setSlot(initialized);
      } else {
        setSlot(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [guide.guideId, stepIds]);

  const mutateSlot = useCallback(
    (mutate: (slot: ProgressSlot) => ProgressSlot) => {
      setSlot((previous) => {
        if (!previous) return previous;
        const next = {
          ...mutate(previous),
          lastActivityAt: new Date().toISOString(),
        };
        // Immediate write-through (FR-B1); mutate is pure, so the StrictMode
        // double-invoke just writes the same value twice.
        void writeSlot(next);
        return next;
      });
    },
    [],
  );

  const toggleDone = useCallback(
    (stepId: string) => {
      mutateSlot((slot) => {
        const itemStates = { ...slot.itemStates };
        const wasDone = itemStates[stepId]?.state === "done";
        if (wasDone) {
          delete itemStates[stepId];
        } else {
          itemStates[stepId] = { state: "done", at: new Date().toISOString() };
        }
        let currentStepId = slot.currentStepId;
        if (!wasDone && stepId === slot.currentStepId) {
          currentStepId = advancePointer(
            stepIds,
            new Set(Object.keys(itemStates)),
            stepId,
          );
        }
        return { ...slot, itemStates, currentStepId };
      });
    },
    [mutateSlot, stepIds],
  );

  const movePointer = useCallback(
    (stepId: string) => {
      mutateSlot((slot) => ({ ...slot, currentStepId: stepId }));
    },
    [mutateSlot],
  );

  const adjustCounter = useCallback(
    (itemId: string, delta: number) => {
      mutateSlot((slot) => ({
        ...slot,
        counterValues: {
          ...slot.counterValues,
          [itemId]: Math.max(0, (slot.counterValues[itemId] ?? 0) + delta),
        },
      }));
    },
    [mutateSlot],
  );

  const resetCounter = useCallback(
    (itemId: string) => {
      mutateSlot((slot) => {
        const counterValues = { ...slot.counterValues };
        delete counterValues[itemId];
        return { ...slot, counterValues };
      });
    },
    [mutateSlot],
  );

  if (slot === null) return { ready: false };
  return {
    ready: true,
    currentStepId: slot.currentStepId,
    doneIds: new Set(
      Object.entries(slot.itemStates)
        .filter(([, value]) => value.state === "done")
        .map(([id]) => id),
    ),
    counterValues: slot.counterValues,
    toggleDone,
    movePointer,
    adjustCounter,
    resetCounter,
  };
}
