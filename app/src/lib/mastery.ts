import type { ProgressSlot, RaMapping } from "@/schema";

// Mastery proxy (§7 S4): an achievement counts as earned when its mapped target
// is done — exactly what Sync reconciles, so this needs no stored RA state and
// no RA API call. Null when the guide has no RA set.
//
// Lives in lib/ rather than beside the cleanup screen because the library also
// reads it now (design v2 puts ACHIEVEMENTS on every guide row), and nothing
// outside main.tsx may import src/app/**.
export function mastery(
  raMapping: RaMapping | null,
  doneIds: ReadonlySet<string>,
): { earned: number; total: number } | null {
  if (!raMapping || raMapping.entries.length === 0) return null;
  const earned = raMapping.entries.filter((e) =>
    doneIds.has(e.targetItemId),
  ).length;
  return { earned, total: raMapping.entries.length };
}

// The done set a slot carries. Skipped is a state of its own (FR-B2) and never
// counts as done — for mastery or anything else.
export function doneIdsOf(slot: ProgressSlot | undefined): ReadonlySet<string> {
  if (!slot) return new Set();
  return new Set(
    Object.entries(slot.itemStates)
      .filter(([, value]) => value.state === "done")
      .map(([id]) => id),
  );
}
