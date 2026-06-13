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
      skippedIds: ReadonlySet<string>;
      counterValues: Readonly<Record<string, number>>;
      toggleDone: (itemId: string) => void;
      toggleSkip: (stepId: string) => void;
      markThrough: (stepId: string) => void;
      markManyDone: (itemIds: string[]) => void;
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
  const chapter = guide.chapters.find((c) =>
    c.steps.some((s) => s.id === slot.currentStepId),
  );
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

  const mutateSlot = useCallback(
    (mutate: (slot: ProgressSlot) => ProgressSlot) => {
      setSlot((previous) => {
        if (!previous) return previous;
        const next = withStats(
          { ...mutate(previous), lastActivityAt: new Date().toISOString() },
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
    (itemId: string) => {
      mutateSlot((slot) => {
        const itemStates = { ...slot.itemStates };
        const wasDone = itemStates[itemId]?.state === "done";
        if (wasDone) {
          delete itemStates[itemId];
        } else {
          // Done replaces a skip — the two are exclusive (FR-B2).
          itemStates[itemId] = { state: "done", at: new Date().toISOString() };
        }
        let currentStepId = slot.currentStepId;
        if (!wasDone && itemId === slot.currentStepId) {
          currentStepId = advancePointer(
            stepIds,
            new Set(Object.keys(itemStates)),
            itemId,
          );
        }
        return { ...slot, itemStates, currentStepId };
      });
    },
    [mutateSlot, stepIds],
  );

  const toggleSkip = useCallback(
    (stepId: string) => {
      mutateSlot((slot) => {
        const existing = slot.itemStates[stepId];
        // Skip on a done step is a no-op; uncheck first.
        if (existing?.state === "done") return slot;
        const itemStates = { ...slot.itemStates };
        if (existing?.state === "skipped") {
          delete itemStates[stepId];
        } else {
          itemStates[stepId] = {
            state: "skipped",
            at: new Date().toISOString(),
          };
        }
        let currentStepId = slot.currentStepId;
        // Skipping the step under the pointer moves on, same as checking it.
        if (
          itemStates[stepId]?.state === "skipped" &&
          stepId === slot.currentStepId
        ) {
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

  // P2 burst: one tap marks every untouched step between the pointer and
  // the tapped step (inclusive) done — deliberate skips survive — then the
  // pointer advances past. One slot write.
  const markThrough = useCallback(
    (stepId: string) => {
      mutateSlot((slot) => {
        const to = stepIds.indexOf(stepId);
        if (to === -1) return slot;
        const fromIndex = slot.currentStepId
          ? stepIds.indexOf(slot.currentStepId)
          : 0;
        const start = fromIndex === -1 ? 0 : Math.min(fromIndex, to);
        const end = fromIndex === -1 ? to : Math.max(fromIndex, to);
        const itemStates = { ...slot.itemStates };
        const at = new Date().toISOString();
        for (const id of stepIds.slice(start, end + 1)) {
          if (!itemStates[id]) {
            itemStates[id] = { state: "done", at };
          }
        }
        const endId = stepIds[end];
        const currentStepId = endId
          ? advancePointer(stepIds, new Set(Object.keys(itemStates)), endId)
          : slot.currentStepId;
        return { ...slot, itemStates, currentStepId };
      });
    },
    [mutateSlot, stepIds],
  );

  // Additive bulk mark for RA Sync (FR-C2): set every given item done in one
  // write, overriding a skip, never un-marking, and leaving the pointer where
  // the player left it. Atomic — one slot write for the whole sync.
  const markManyDone = useCallback(
    (itemIds: string[]) => {
      mutateSlot((slot) => {
        const itemStates = { ...slot.itemStates };
        const at = new Date().toISOString();
        for (const id of itemIds) {
          if (itemStates[id]?.state !== "done") {
            itemStates[id] = { state: "done", at };
          }
        }
        return { ...slot, itemStates };
      });
    },
    [mutateSlot],
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
    counterValues: slot.counterValues,
    toggleDone,
    toggleSkip,
    markThrough,
    markManyDone,
    movePointer,
    adjustCounter,
    resetCounter,
  };
}
