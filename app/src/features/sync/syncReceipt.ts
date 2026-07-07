import type { RaMappingEntry } from "@/schema";
import type { AchievementId } from "./types";

// FR-C3: every unlocked achievement falls into exactly one bucket, so the three
// counts sum to the unlock total. `toMark` is the de-duped set of target items
// to actually write (two achievements can land on one item).
export type SyncReceipt = {
  newlyMarked: number;
  alreadyDone: number;
  unmapped: number;
};

export function computeSync(
  unlocked: AchievementId[],
  entries: RaMappingEntry[],
  doneIds: ReadonlySet<string>,
): { receipt: SyncReceipt; toMark: string[] } {
  const targetByAchievement = new Map(
    entries.map((entry) => [entry.raAchievementId, entry.targetItemId]),
  );

  let newlyMarked = 0;
  let alreadyDone = 0;
  let unmapped = 0;
  const toMark = new Set<string>();

  for (const id of unlocked) {
    const target = targetByAchievement.get(id);
    if (target === undefined) {
      unmapped += 1;
    } else if (doneIds.has(target)) {
      alreadyDone += 1;
    } else {
      newlyMarked += 1;
      toMark.add(target);
    }
  }

  return {
    receipt: { newlyMarked, alreadyDone, unmapped },
    toMark: [...toMark],
  };
}
