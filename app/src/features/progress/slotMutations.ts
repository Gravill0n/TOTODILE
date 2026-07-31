import type { ProgressSlot } from "@/schema";
import { advancePointer } from "./pointer";

// Pure slot transitions, extracted verbatim from useGuideProgress: no Date,
// no storage — the hook supplies `at` and owns write-through + stats (FR-B1).

// The widget rows a step hands over (`checkable.stepRef`, 2026-07-31). Ticking
// a step ticks them; unticking it takes them back. The fan-out lives here
// rather than in the callers because every way a step settles routes through
// this file — the tap, the burst, and the RA sync — and a caller added later
// would otherwise have to remember.
//
// One direction: a row never marks its step. A step is a stretch of route
// walked, a row is a thing found, and one of five things found does not mean
// the route is walked.
export type LinkedItems = (stepId: string) => readonly string[];

const NO_LINKS: LinkedItems = () => [];

// The shared "advance the pointer past a newly-settled step" move: checking
// or skipping the step under the pointer walks it forward (§6.7).
function advancedPast(
  stepIds: readonly string[],
  itemStates: ProgressSlot["itemStates"],
  stepId: string,
): string | null {
  return advancePointer(stepIds, new Set(Object.keys(itemStates)), stepId);
}

export function toggleDone(
  slot: ProgressSlot,
  stepIds: readonly string[],
  itemId: string,
  at: string,
  linkedItems: LinkedItems = NO_LINKS,
): ProgressSlot {
  const itemStates = { ...slot.itemStates };
  const wasDone = itemStates[itemId]?.state === "done";
  if (wasDone) {
    delete itemStates[itemId];
  } else {
    // Done replaces a skip — the two are exclusive (FR-B2).
    itemStates[itemId] = { state: "done", at };
  }
  // The rows this step hands over follow it, both ways: unticking a step you
  // ticked by mistake must not leave its loot ticked. A row the player had
  // ticked by hand is taken back too — the alternative is remembering who
  // ticked what, which is a second progress model for a rare case.
  for (const linked of linkedItems(itemId)) {
    if (wasDone) delete itemStates[linked];
    else itemStates[linked] = { state: "done", at };
  }
  let currentStepId = slot.currentStepId;
  if (!wasDone && itemId === slot.currentStepId) {
    currentStepId = advancedPast(stepIds, itemStates, itemId);
  }
  return { ...slot, itemStates, currentStepId };
}

export function toggleSkip(
  slot: ProgressSlot,
  stepIds: readonly string[],
  stepId: string,
  at: string,
): ProgressSlot {
  const existing = slot.itemStates[stepId];
  // Skip on a done step is a no-op; uncheck first.
  if (existing?.state === "done") return slot;
  const itemStates = { ...slot.itemStates };
  if (existing?.state === "skipped") {
    delete itemStates[stepId];
  } else {
    itemStates[stepId] = { state: "skipped", at };
  }
  let currentStepId = slot.currentStepId;
  // Skipping the step under the pointer moves on, same as checking it.
  if (
    itemStates[stepId]?.state === "skipped" &&
    stepId === slot.currentStepId
  ) {
    currentStepId = advancedPast(stepIds, itemStates, stepId);
  }
  return { ...slot, itemStates, currentStepId };
}

// P2 burst: one tap marks every untouched step between the pointer and
// the tapped step (inclusive) done — deliberate skips survive — then the
// pointer advances past.
export function markThrough(
  slot: ProgressSlot,
  stepIds: readonly string[],
  stepId: string,
  at: string,
  linkedItems: LinkedItems = NO_LINKS,
): ProgressSlot {
  const to = stepIds.indexOf(stepId);
  if (to === -1) return slot;
  const fromIndex = slot.currentStepId
    ? stepIds.indexOf(slot.currentStepId)
    : 0;
  const start = fromIndex === -1 ? 0 : Math.min(fromIndex, to);
  const end = fromIndex === -1 ? to : Math.max(fromIndex, to);
  const itemStates = { ...slot.itemStates };
  for (const id of stepIds.slice(start, end + 1)) {
    if (!itemStates[id]) {
      itemStates[id] = { state: "done", at };
      // A burst settles many steps at once; each still hands over its rows.
      // Additive here, matching the burst itself — a deliberate skip inside
      // the range keeps its rows untouched because the step is not marked.
      for (const linked of linkedItems(id)) {
        if (itemStates[linked]?.state !== "done") {
          itemStates[linked] = { state: "done", at };
        }
      }
    }
  }
  const endId = stepIds[end];
  const currentStepId = endId
    ? advancedPast(stepIds, itemStates, endId)
    : slot.currentStepId;
  return { ...slot, itemStates, currentStepId };
}

// Additive bulk mark for RA Sync (FR-C2): set every given item done,
// overriding a skip, never un-marking, and leaving the pointer where the
// player left it.
export function markManyDone(
  slot: ProgressSlot,
  itemIds: readonly string[],
  at: string,
  linkedItems: LinkedItems = NO_LINKS,
): ProgressSlot {
  const itemStates = { ...slot.itemStates };
  const mark = (id: string) => {
    if (itemStates[id]?.state !== "done") {
      itemStates[id] = { state: "done", at };
    }
  };
  for (const id of itemIds) {
    mark(id);
    // An RA unlock that maps to a step means the step happened, so what that
    // step hands over happened too. Still additive — sync never un-marks.
    for (const linked of linkedItems(id)) mark(linked);
  }
  return { ...slot, itemStates };
}

// FR-B5: an explicit "I've seen this missable" — distinct from done/skip,
// idempotent. The warning stays dismissed across sessions.
export function acknowledgeMissable(
  slot: ProgressSlot,
  stepId: string,
): ProgressSlot {
  return slot.acknowledgedMissables.includes(stepId)
    ? slot
    : {
        ...slot,
        acknowledgedMissables: [...slot.acknowledgedMissables, stepId],
      };
}

export function movePointer(slot: ProgressSlot, stepId: string): ProgressSlot {
  return { ...slot, currentStepId: stepId };
}

export function adjustCounter(
  slot: ProgressSlot,
  itemId: string,
  delta: number,
): ProgressSlot {
  return {
    ...slot,
    counterValues: {
      ...slot.counterValues,
      [itemId]: Math.max(0, (slot.counterValues[itemId] ?? 0) + delta),
    },
  };
}

export function resetCounter(slot: ProgressSlot, itemId: string): ProgressSlot {
  const counterValues = { ...slot.counterValues };
  delete counterValues[itemId];
  return { ...slot, counterValues };
}
