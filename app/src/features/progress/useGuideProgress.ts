import { useCallback, useEffect, useMemo, useState } from "react";
import { chapterOf, guideStepIds } from "@/lib/guide";
import type { GuideFile } from "@/schema";
import { type ProgressSlot, readSlot, writeSlot } from "./progressStore";
import * as mutations from "./slotMutations";

export type GuideProgress =
  | { ready: false }
  | {
      ready: true;
      currentStepId: string | null;
      doneIds: ReadonlySet<string>;
      skippedIds: ReadonlySet<string>;
      acknowledgedMissableIds: ReadonlySet<string>;
      counterValues: Readonly<Record<string, number>>;
      toggleDone: (itemId: string) => void;
      toggleSkip: (stepId: string) => void;
      markThrough: (stepId: string) => void;
      markManyDone: (itemIds: string[]) => void;
      acknowledgeMissable: (stepId: string) => void;
      movePointer: (stepId: string) => void;
      adjustCounter: (itemId: string, delta: number) => void;
      resetCounter: (itemId: string) => void;
    };

// FR-A3 stats are denormalized into the slot at write time — the library
// screen reads slots only, never guide files.
function withStats(
  slot: ProgressSlot,
  guide: GuideFile,
  stepIds: readonly string[],
): ProgressSlot {
  const stepsDone = stepIds.filter(
    (id) => slot.itemStates[id]?.state === "done",
  ).length;
  const chapter = chapterOf(guide, slot.currentStepId);
  return {
    ...slot,
    stats: {
      stepsDone,
      stepsTotal: stepIds.length,
      currentChapterTitle: chapter?.title ?? null,
    },
  };
}

// Owns the progress slot for one guide. Lives at the screen level — spine
// components stay pure (data + callbacks in, UI out, §22.1). Every change
// is written immediately (FR-B1); the transitions themselves are the pure
// functions in slotMutations.
export function useGuideProgress(guide: GuideFile): GuideProgress {
  const stepIds = useMemo(() => guideStepIds(guide), [guide]);
  const [slot, setSlot] = useState<ProgressSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readSlot(guide.guideId).then((loaded) => {
      if (cancelled) return;
      // First open: the pointer starts at the first step and is stored
      // from then on (§6.7) — never re-derived. Stats refresh on every
      // open so they track guide updates.
      const initialized = withStats(
        {
          ...loaded,
          currentStepId: loaded.currentStepId ?? stepIds[0] ?? null,
        },
        guide,
        stepIds,
      );
      void writeSlot(initialized);
      setSlot(initialized);
    });
    return () => {
      cancelled = true;
    };
  }, [guide, stepIds]);

  // One timestamp per user action, taken here so the pure mutators stay
  // date-free and the StrictMode double-invoke writes identical values.
  const mutateSlot = useCallback(
    (mutate: (slot: ProgressSlot, at: string) => ProgressSlot) => {
      const at = new Date().toISOString();
      setSlot((previous) => {
        if (!previous) return previous;
        const next = withStats(
          { ...mutate(previous, at), lastActivityAt: at },
          guide,
          stepIds,
        );
        // Immediate write-through (FR-B1); mutate is pure, so the StrictMode
        // double-invoke just writes the same value twice.
        void writeSlot(next);
        return next;
      });
    },
    [guide, stepIds],
  );

  const toggleDone = useCallback(
    (itemId: string) =>
      mutateSlot((slot, at) => mutations.toggleDone(slot, stepIds, itemId, at)),
    [mutateSlot, stepIds],
  );

  const toggleSkip = useCallback(
    (stepId: string) =>
      mutateSlot((slot, at) => mutations.toggleSkip(slot, stepIds, stepId, at)),
    [mutateSlot, stepIds],
  );

  const markThrough = useCallback(
    (stepId: string) =>
      mutateSlot((slot, at) =>
        mutations.markThrough(slot, stepIds, stepId, at),
      ),
    [mutateSlot, stepIds],
  );

  const markManyDone = useCallback(
    (itemIds: string[]) =>
      mutateSlot((slot, at) => mutations.markManyDone(slot, itemIds, at)),
    [mutateSlot],
  );

  const acknowledgeMissable = useCallback(
    (stepId: string) =>
      mutateSlot((slot) => mutations.acknowledgeMissable(slot, stepId)),
    [mutateSlot],
  );

  const movePointer = useCallback(
    (stepId: string) =>
      mutateSlot((slot) => mutations.movePointer(slot, stepId)),
    [mutateSlot],
  );

  const adjustCounter = useCallback(
    (itemId: string, delta: number) =>
      mutateSlot((slot) => mutations.adjustCounter(slot, itemId, delta)),
    [mutateSlot],
  );

  const resetCounter = useCallback(
    (itemId: string) =>
      mutateSlot((slot) => mutations.resetCounter(slot, itemId)),
    [mutateSlot],
  );

  if (slot === null) return { ready: false };
  const byState = (state: "done" | "skipped") =>
    new Set(
      Object.entries(slot.itemStates)
        .filter(([, value]) => value.state === state)
        .map(([id]) => id),
    );
  return {
    ready: true,
    currentStepId: slot.currentStepId,
    doneIds: byState("done"),
    skippedIds: byState("skipped"),
    acknowledgedMissableIds: new Set(slot.acknowledgedMissables),
    counterValues: slot.counterValues,
    toggleDone,
    toggleSkip,
    markThrough,
    markManyDone,
    acknowledgeMissable,
    movePointer,
    adjustCounter,
    resetCounter,
  };
}
